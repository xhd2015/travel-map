package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/xhd2015/dot-pkgs/go-pkgs/ai"
	"github.com/xhd2015/dot-pkgs/go-pkgs/ai/tools"
	aitypes "github.com/xhd2015/dot-pkgs/go-pkgs/ai/types"
)

type aiChatRequest struct {
	Messages []aitypes.Message `json:"messages"`
	PlanID   string            `json:"planId"`
}

func getAIConfig() aitypes.Config {
	provider := aitypes.Provider(os.Getenv("AI_PROVIDER"))
	if provider == "" {
		provider = aitypes.ProviderOpenAI
	}
	return aitypes.Config{
		Provider: provider,
		APIKey:   os.Getenv("AI_API_KEY"),
		BaseURL:  os.Getenv("AI_BASE_URL"),
		Model:    os.Getenv("AI_MODEL"),
	}
}

func buildSystemPrompt(planID string) string {
	prompt := `You are a helpful travel planning assistant. You help users plan their trips by:
- Suggesting destinations, spots to visit, and foods to try
- Helping organize itineraries and schedules
- Answering questions about travel logistics
- Providing cultural tips and recommendations

Be concise, practical, and friendly. Respond in the same language as the user's message.`

	if planID == "" {
		return prompt
	}

	planStore := globalStore.GetPlanStore(planID)
	plans, err := globalStore.ListPlans()
	if err == nil {
		for _, p := range plans {
			if p.ID == planID {
				prompt += fmt.Sprintf("\n\nCurrent plan: %s", p.Name)
				if p.Description != "" {
					prompt += fmt.Sprintf("\nDescription: %s", p.Description)
				}
				break
			}
		}
	}

	dests, err := planStore.ListDestinations()
	if err == nil && len(dests) > 0 {
		prompt += "\n\nDestinations in this plan:"
		for _, d := range dests {
			prompt += fmt.Sprintf("\n- %s", d.Name)
		}
	}

	return prompt
}

func getAvailableTools() []aitypes.Tool {
	searchCfg := getWebSearchConfig()
	if !searchCfg.Enabled() {
		return nil
	}
	return []aitypes.Tool{tools.WebSearchToolDefinition()}
}

type sseWriter struct {
	w       http.ResponseWriter
	flusher http.Flusher
}

func (s *sseWriter) sendChunk(chunk aitypes.StreamChunk) {
	data, err := json.Marshal(chunk)
	if err != nil {
		return
	}
	fmt.Fprintf(s.w, "data: %s\n\n", data)
	s.flusher.Flush()
}

func (s *sseWriter) sendContent(text string) {
	s.sendChunk(aitypes.StreamChunk{Type: aitypes.ChunkTypeContent, Content: text})
}

func (s *sseWriter) sendError(text string) {
	s.sendChunk(aitypes.StreamChunk{Type: aitypes.ChunkTypeError, Error: text})
}

func (s *sseWriter) sendDone() {
	s.sendChunk(aitypes.StreamChunk{Type: aitypes.ChunkTypeDone})
}

func handleAIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req aiChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(req.Messages) == 0 {
		http.Error(w, "messages required", http.StatusBadRequest)
		return
	}

	cfg := getAIConfig()
	if cfg.APIKey == "" {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": "AI_API_KEY not configured"})
		return
	}

	provider := ai.GetProvider(cfg)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}
	sse := &sseWriter{w: w, flusher: flusher}

	availableTools := getAvailableTools()

	// If no tools, use simple streaming
	if len(availableTools) == 0 {
		err := provider.CallStream(r.Context(), toMessages(req.PlanID, req.Messages), func(chunk aitypes.StreamChunk) error {
			sse.sendChunk(chunk)
			return nil
		})
		if err != nil {
			sse.sendError(err.Error())
		}
		return
	}

	// Tool calling loop
	messages := toToolMessages(req.PlanID, req.Messages)
	opts := aitypes.ChatOptions{Tools: availableTools}
	searchCfg := getWebSearchConfig()

	const maxToolRounds = 5
	for round := 0; round < maxToolRounds; round++ {
		resp, err := provider.CallWithTools(r.Context(), messages, opts)
		if err != nil {
			sse.sendError(fmt.Sprintf("AI API error: %v", err))
			return
		}

		if len(resp.ToolCalls) == 0 {
			if resp.Content != "" {
				sse.sendContent(resp.Content)
			}
			sse.sendDone()
			return
		}

		messages = append(messages, aitypes.ToolMessage{
			Message:   aitypes.Message{Role: "assistant", Content: resp.Content},
			ToolCalls: resp.ToolCalls,
		})

		for _, tc := range resp.ToolCalls {
			result := executeToolCall(r, sse, tc, searchCfg)
			messages = append(messages, aitypes.ToolMessage{
				Message: aitypes.Message{Role: "tool"},
				ToolResult: &aitypes.ToolResult{
					ToolCallID: tc.ID,
					Name:       tc.Name,
					Content:    result,
				},
			})
		}
	}

	sse.sendError("Too many tool call rounds")
}

func executeToolCall(r *http.Request, sse *sseWriter, tc aitypes.ToolCall, searchCfg tools.WebSearchConfig) string {
	if tc.Name != "web_search" {
		return fmt.Sprintf("Unknown tool: %s", tc.Name)
	}

	var args struct {
		Query string `json:"query"`
	}
	if err := json.Unmarshal([]byte(tc.Arguments), &args); err != nil {
		return fmt.Sprintf("Invalid arguments: %v", err)
	}

	sse.sendContent(fmt.Sprintf("🔍 正在搜索: %s\n\n", args.Query))

	results, err := tools.WebSearch(r.Context(), searchCfg, args.Query)
	if err != nil {
		return fmt.Sprintf("Search failed: %s", err.Error())
	}
	return results
}

func toMessages(planID string, msgs []aitypes.Message) []aitypes.Message {
	result := make([]aitypes.Message, 0, len(msgs)+1)
	result = append(result, aitypes.Message{Role: "system", Content: buildSystemPrompt(planID)})
	result = append(result, msgs...)
	return result
}

func toToolMessages(planID string, msgs []aitypes.Message) []aitypes.ToolMessage {
	result := make([]aitypes.ToolMessage, 0, len(msgs)+1)
	result = append(result, aitypes.ToolMessage{
		Message: aitypes.Message{Role: "system", Content: buildSystemPrompt(planID)},
	})
	for _, m := range msgs {
		result = append(result, aitypes.ToolMessage{Message: m})
	}
	return result
}
