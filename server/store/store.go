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
	// Plan might have description etc later
}

type Destination struct {
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
	PlayTime            string  `json:"play_time"`            // 游玩时长
	ReservationRequired bool    `json:"reservation_required"` // 需预约
	ReservationInfo     string  `json:"reservation_info"`     // 预约信息
	Lat                 float64 `json:"lat"`
	Lng                 float64 `json:"lng"`
	Icon                string  `json:"icon"`         // default, flag, star, etc.
	HideInList          bool    `json:"hide_in_list"` // 是否在列表中隐藏
	Website             string  `json:"website"`      // 官网
	Rating              float64 `json:"rating"`       // 星级 1-5
}

type Food struct {
	ID                     string  `json:"id"`
	Name                   string  `json:"name"`
	Time                   string  `json:"time"`
	Type                   string  `json:"type"`                    // 菜系/类型
	Rating                 float64 `json:"rating"`                  // 星级 1-5
	Comment                string  `json:"comment"`                 // 评价/推荐菜
	RecommendedRestaurants string  `json:"recommended_restaurants"` // 推荐餐厅
	ReservationRequired    bool    `json:"reservation_required"`    // 需预约
	ReservationInfo        string  `json:"reservation_info"`        // 预约信息
	Lat                    float64 `json:"lat"`
	Lng                    float64 `json:"lng"`
	Website                string  `json:"website"` // 官网
}

type Route struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Time     string   `json:"time"`
	Spots    []string `json:"spots"`
	Duration string   `json:"duration"` // 耗时
	Story    string   `json:"story"`
	Children []Route  `json:"children,omitempty"`
}

type Question struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type Reference struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Link        string `json:"link"`
}

type Config struct {
	MapImage    string             `json:"map_image"`
	Destination *DestinationConfig `json:"destination,omitempty"`
	MapState    *MapState          `json:"map_state,omitempty"`
	MapProvider string             `json:"map_provider,omitempty"`
}

type DestinationConfig struct {
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

type Schedule struct {
	ID      string `json:"id"`
	Content string `json:"content"`
}

type ItineraryItem struct {
	ID          string `json:"id"`
	Time        string `json:"time"`
	Activity    string `json:"activity"`
	Description string `json:"description"`
	Reference   string `json:"reference"`
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

// PlanStore manages data for a specific plan (which contains destinations)
type PlanStore struct {
	Dir string
}

func (s *PlanStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	// Ensure destinations directory
	destDir := filepath.Join(s.Dir, "destinations")
	if _, err := os.Stat(destDir); os.IsNotExist(err) {
		if err := os.MkdirAll(destDir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *PlanStore) ListDestinations() ([]Destination, error) {
	if err := s.EnsureDir(); err != nil {
		return nil, err
	}
	path := filepath.Join(s.Dir, "destinations.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Destination{}, nil
	}
	if err != nil {
		return nil, err
	}
	var dests []Destination
	if len(data) == 0 {
		return []Destination{}, nil
	}
	if err := json.Unmarshal(data, &dests); err != nil {
		return nil, err
	}
	return dests, nil
}

func (s *PlanStore) SaveDestinations(dests []Destination) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, "destinations.json")
	data, err := json.MarshalIndent(dests, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *PlanStore) CreateDestination(name string) (Destination, error) {
	dests, err := s.ListDestinations()
	if err != nil {
		return Destination{}, err
	}
	newDest := Destination{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		Name:      name,
		CreatedAt: time.Now().Format(time.RFC3339),
		Order:     len(dests),
	}
	dests = append(dests, newDest)
	if err := s.SaveDestinations(dests); err != nil {
		return Destination{}, err
	}
	// Ensure destination directory exists
	destStore := s.GetDestinationStore(newDest.ID)
	if err := destStore.EnsureDir(); err != nil {
		return Destination{}, err
	}
	return newDest, nil
}

func (s *PlanStore) UpdateDestination(id string, update Destination) error {
	dests, err := s.ListDestinations()
	if err != nil {
		return err
	}
	for i, d := range dests {
		if d.ID == id {
			if update.Name != "" {
				dests[i].Name = update.Name
			}
			dests[i].Order = update.Order
			return s.SaveDestinations(dests)
		}
	}
	return fmt.Errorf("destination not found")
}

func (s *PlanStore) DeleteDestination(id string) error {
	dests, err := s.ListDestinations()
	if err != nil {
		return err
	}
	var newDests []Destination
	for _, d := range dests {
		if d.ID != id {
			newDests = append(newDests, d)
		}
	}
	if err := s.SaveDestinations(newDests); err != nil {
		return err
	}
	// Remove directory
	return os.RemoveAll(filepath.Join(s.Dir, "destinations", id))
}

func (s *PlanStore) GetDestinationStore(destID string) *DestinationStore {
	return &DestinationStore{Dir: filepath.Join(s.Dir, "destinations", destID)}
}

// DestinationStore manages data for a specific destination (was PlanStore)
type DestinationStore struct {
	Dir string
}

func (s *DestinationStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *DestinationStore) loadFile(filename string, v interface{}) error {
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

func (s *DestinationStore) saveFile(filename string, v interface{}) error {
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

func (s *DestinationStore) LoadSpots() ([]Spot, error) {
	var spots []Spot
	err := s.loadFile("spots.json", &spots)
	if spots == nil {
		spots = []Spot{}
	}
	return spots, err
}

func (s *DestinationStore) SaveSpots(spots []Spot) error {
	return s.saveFile("spots.json", spots)
}

func (s *DestinationStore) LoadFoods() ([]Food, error) {
	var foods []Food
	err := s.loadFile("foods.json", &foods)
	if foods == nil {
		foods = []Food{}
	}
	return foods, err
}

func (s *DestinationStore) SaveFoods(foods []Food) error {
	return s.saveFile("foods.json", foods)
}

func (s *DestinationStore) LoadRoutes() ([]Route, error) {
	var routes []Route
	err := s.loadFile("routes.json", &routes)
	if routes == nil {
		routes = []Route{}
	}
	return routes, err
}

func (s *DestinationStore) SaveRoutes(routes []Route) error {
	return s.saveFile("routes.json", routes)
}

func (s *DestinationStore) LoadQuestions() ([]Question, error) {
	var questions []Question
	err := s.loadFile("questions.json", &questions)
	if questions == nil {
		questions = []Question{}
	}
	return questions, err
}

func (s *DestinationStore) SaveQuestions(questions []Question) error {
	return s.saveFile("questions.json", questions)
}

func (s *DestinationStore) LoadReferences() ([]Reference, error) {
	var references []Reference
	err := s.loadFile("references.json", &references)
	if references == nil {
		references = []Reference{}
	}
	return references, err
}

func (s *DestinationStore) SaveReferences(references []Reference) error {
	return s.saveFile("references.json", references)
}

func (s *DestinationStore) LoadConfig() (Config, error) {
	var config Config
	err := s.loadFile("config.json", &config)
	return config, err
}

func (s *DestinationStore) SaveConfig(config Config) error {
	return s.saveFile("config.json", config)
}

func (s *DestinationStore) LoadGuideImages() ([]GuideImage, error) {
	var images []GuideImage
	err := s.loadFile("guide_images.json", &images)
	if images == nil {
		images = []GuideImage{}
	}
	return images, err
}

func (s *DestinationStore) SaveGuideImages(images []GuideImage) error {
	return s.saveFile("guide_images.json", images)
}

func (s *DestinationStore) LoadSchedules() ([]Schedule, error) {
	var schedules []Schedule
	err := s.loadFile("schedules.json", &schedules)
	if schedules == nil {
		schedules = []Schedule{}
	}
	return schedules, err
}

func (s *DestinationStore) SaveSchedules(schedules []Schedule) error {
	return s.saveFile("schedules.json", schedules)
}

func (s *DestinationStore) LoadItineraries() ([]ItineraryItem, error) {
	var itineraries []ItineraryItem
	err := s.loadFile("itineraries.json", &itineraries)
	if itineraries == nil {
		itineraries = []ItineraryItem{}
	}
	return itineraries, err
}

func (s *DestinationStore) SaveItineraries(itineraries []ItineraryItem) error {
	return s.saveFile("itineraries.json", itineraries)
}
