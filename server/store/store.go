package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type Plan struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	Order     int    `json:"order"` // 序号
}

type Spot struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Time                string  `json:"time"`
	Interior            string  `json:"interior"`             // 内部
	Story               string  `json:"story"`                // 典故
	ReservationRequired bool    `json:"reservation_required"` // 需预约
	ReservationInfo     string  `json:"reservation_info"`     // 预约信息
	Lat                 float64 `json:"lat"`
	Lng                 float64 `json:"lng"`
	Icon                string  `json:"icon"`         // default, flag, star, etc.
	HideInList          bool    `json:"hide_in_list"` // 是否在列表中隐藏
}

type Route struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Time     string   `json:"time"`
	Spots    []string `json:"spots"`
	Duration string   `json:"duration"` // 耗时
	Story    string   `json:"story"`
}

type Question struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type Config struct {
	MapImage    string       `json:"map_image"`
	Destination *Destination `json:"destination,omitempty"`
	MapState    *MapState    `json:"map_state,omitempty"`
}

type Destination struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

type MapState struct {
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
	Zoom int     `json:"zoom"`
}

type GuideImage struct {
	ID  string `json:"id"`
	URL string `json:"url"`
	// potentially caption, etc.
}

// GlobalStore manages plans
type GlobalStore struct {
	Dir string
}

func NewGlobalStore(dir string) *GlobalStore {
	return &GlobalStore{Dir: dir}
}

func (s *GlobalStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	// Also ensure plans directory
	plansDir := filepath.Join(s.Dir, "plans")
	if _, err := os.Stat(plansDir); os.IsNotExist(err) {
		if err := os.MkdirAll(plansDir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *GlobalStore) ListPlans() ([]Plan, error) {
	if err := s.EnsureDir(); err != nil {
		return nil, err
	}
	path := filepath.Join(s.Dir, "plans.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Plan{}, nil
	}
	if err != nil {
		return nil, err
	}
	var plans []Plan
	if len(data) == 0 {
		return []Plan{}, nil
	}
	if err := json.Unmarshal(data, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

func (s *GlobalStore) SavePlans(plans []Plan) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, "plans.json")
	data, err := json.MarshalIndent(plans, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *GlobalStore) CreatePlan(name string) (Plan, error) {
	plans, err := s.ListPlans()
	if err != nil {
		return Plan{}, err
	}
	newPlan := Plan{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		Name:      name,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	plans = append(plans, newPlan)
	if err := s.SavePlans(plans); err != nil {
		return Plan{}, err
	}
	// Ensure plan directory exists
	planStore := s.GetPlanStore(newPlan.ID)
	if err := planStore.EnsureDir(); err != nil {
		return Plan{}, err
	}
	return newPlan, nil
}

func (s *GlobalStore) UpdatePlan(id string, update Plan) error {
	plans, err := s.ListPlans()
	if err != nil {
		return err
	}
	for i, p := range plans {
		if p.ID == id {
			if update.Name != "" {
				plans[i].Name = update.Name
			}
			if update.Order != 0 {
				plans[i].Order = update.Order
			}
			// Special handling for order=0 if we want to allow unsetting it?
			// For now assuming 0 is default/unset. If user sets 0, it means no order.
			// But if update.Order is 0, it might mean field missing.
			// Let's assume frontend sends full object or specific fields.
			// If JSON unmarshal, 0 is default.
			// Let's just update fields provided. But Go struct doesn't know "provided" vs "zero value" easily without pointers.
			// Since we only added Order, let's look at frontend.
			// We can just overwrite the plan with new data if we pass the full plan.
			// Or simple approach: Just save the list with modifications.
			
			// Actually, to support partial updates properly without pointers for primitives (int), it's tricky.
			// But for Order, let's assume we want to update it.
			// Let's change UpdatePlan to take the FULL modified plan list or just modify the specific plan in memory and save.
			// The caller `server.go` will handle unmarshaling.
			// Let's make this method simple: Update the specific plan with ID.
			
			// Re-approach: Let's trust the input `update` contains the values we want to set.
			// If Order is 0, maybe we mean 0.
			plans[i].Order = update.Order 
			// Name is always present?
			if update.Name != "" {
				plans[i].Name = update.Name
			}
			
			return s.SavePlans(plans)
		}
	}
	return fmt.Errorf("plan not found")
}

func (s *GlobalStore) DeletePlan(id string) error {
	plans, err := s.ListPlans()
	if err != nil {
		return err
	}
	var newPlans []Plan
	for _, p := range plans {
		if p.ID != id {
			newPlans = append(newPlans, p)
		}
	}
	if err := s.SavePlans(newPlans); err != nil {
		return err
	}
	// Remove directory
	return os.RemoveAll(filepath.Join(s.Dir, "plans", id))
}

func (s *GlobalStore) GetPlanStore(planID string) *PlanStore {
	return &PlanStore{Dir: filepath.Join(s.Dir, "plans", planID)}
}

// PlanStore manages data for a specific plan
type PlanStore struct {
	Dir string
}

func (s *PlanStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *PlanStore) loadFile(filename string, v interface{}) error {
	path := filepath.Join(s.Dir, filename)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil // Return empty/default
	}
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return nil
	}
	return json.Unmarshal(data, v)
}

func (s *PlanStore) saveFile(filename string, v interface{}) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, filename)
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *PlanStore) LoadSpots() ([]Spot, error) {
	var spots []Spot
	err := s.loadFile("spots.json", &spots)
	if spots == nil {
		spots = []Spot{}
	}
	return spots, err
}

func (s *PlanStore) SaveSpots(spots []Spot) error {
	return s.saveFile("spots.json", spots)
}

func (s *PlanStore) LoadRoutes() ([]Route, error) {
	var routes []Route
	err := s.loadFile("routes.json", &routes)
	if routes == nil {
		routes = []Route{}
	}
	return routes, err
}

func (s *PlanStore) SaveRoutes(routes []Route) error {
	return s.saveFile("routes.json", routes)
}

func (s *PlanStore) LoadQuestions() ([]Question, error) {
	var questions []Question
	err := s.loadFile("questions.json", &questions)
	if questions == nil {
		questions = []Question{}
	}
	return questions, err
}

func (s *PlanStore) SaveQuestions(questions []Question) error {
	return s.saveFile("questions.json", questions)
}

func (s *PlanStore) LoadConfig() (Config, error) {
	var config Config
	err := s.loadFile("config.json", &config)
	return config, err
}

func (s *PlanStore) SaveConfig(config Config) error {
	return s.saveFile("config.json", config)
}

func (s *PlanStore) LoadGuideImages() ([]GuideImage, error) {
	var images []GuideImage
	err := s.loadFile("guide_images.json", &images)
	if images == nil {
		images = []GuideImage{}
	}
	return images, err
}

func (s *PlanStore) SaveGuideImages(images []GuideImage) error {
	return s.saveFile("guide_images.json", images)
}
