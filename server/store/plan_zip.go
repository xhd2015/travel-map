package store

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
)

var zipSectionFiles = map[string]bool{
	"destination.json":  true,
	"spots.json":        true,
	"foods.json":        true,
	"routes.json":       true,
	"questions.json":    true,
	"references.json":   true,
	"config.json":       true,
	"guide_images.json": true,
	"schedules.json":    true,
	"itineraries.json":  true,
}

type normalizedZipFile struct {
	name string
	file *zip.File
}

func (s *GlobalStore) ExportPlanZip(planID string) ([]byte, string, error) {
	plan, err := s.findPlanByID(planID)
	if err != nil {
		return nil, "", err
	}

	planStore := s.GetPlanStore(planID)
	if err := planStore.EnsureDir(); err != nil {
		return nil, "", err
	}

	dests, err := planStore.ListDestinations()
	if err != nil {
		return nil, "", err
	}
	schedule, err := planStore.LoadSchedule()
	if err != nil {
		return nil, "", err
	}

	buf := &bytes.Buffer{}
	zw := zip.NewWriter(buf)

	exportedPlan := plan
	exportedPlan.ID = ""
	if err := addJSONToZip(zw, "plan.json", exportedPlan); err != nil {
		return nil, "", err
	}
	if err := addJSONToZip(zw, "plan_schedule.json", schedule); err != nil {
		return nil, "", err
	}

	for i, d := range dests {
		destStore := planStore.GetDestinationStore(d.ID)

		spots, err := destStore.LoadSpots()
		if err != nil {
			return nil, "", err
		}
		foods, err := destStore.LoadFoods()
		if err != nil {
			return nil, "", err
		}
		routes, err := destStore.LoadRoutes()
		if err != nil {
			return nil, "", err
		}
		questions, err := destStore.LoadQuestions()
		if err != nil {
			return nil, "", err
		}
		references, err := destStore.LoadReferences()
		if err != nil {
			return nil, "", err
		}
		config, err := destStore.LoadConfig()
		if err != nil {
			return nil, "", err
		}
		guideImages, err := destStore.LoadGuideImages()
		if err != nil {
			return nil, "", err
		}
		schedules, err := destStore.LoadSchedules()
		if err != nil {
			return nil, "", err
		}
		itineraries, err := destStore.LoadItineraries()
		if err != nil {
			return nil, "", err
		}

		dirName := fmt.Sprintf("%02d-%s", i+1, sanitizeZipPathSegment(d.Name))
		destArchiveDir := path.Join("destinations", dirName)
		exportedDest := d
		exportedDest.ID = ""

		copiedAssets := make(map[string]string)
		usedImagePaths := make(map[string]bool)

		for idx := range spots {
			relPath, err := s.copyAssetToZipIfNeeded(zw, destArchiveDir, spots[idx].Icon, copiedAssets, usedImagePaths)
			if err != nil {
				return nil, "", err
			}
			if relPath != "" {
				spots[idx].Icon = relPath
			}
		}

		for idx := range references {
			relPath, err := s.copyAssetToZipIfNeeded(zw, destArchiveDir, references[idx].Link, copiedAssets, usedImagePaths)
			if err != nil {
				return nil, "", err
			}
			if relPath != "" {
				references[idx].Link = relPath
			}
		}

		if config.MapImage != "" {
			relPath, err := s.copyAssetToZipIfNeeded(zw, destArchiveDir, config.MapImage, copiedAssets, usedImagePaths)
			if err != nil {
				return nil, "", err
			}
			if relPath != "" {
				config.MapImage = relPath
			}
		}

		for idx := range guideImages {
			relPath, err := s.copyAssetToZipIfNeeded(zw, destArchiveDir, guideImages[idx].URL, copiedAssets, usedImagePaths)
			if err != nil {
				return nil, "", err
			}
			if relPath != "" {
				guideImages[idx].URL = relPath
			}
		}

		if err := addJSONToZip(zw, path.Join(destArchiveDir, "destination.json"), exportedDest); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "spots.json"), spots); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "foods.json"), foods); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "routes.json"), routes); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "questions.json"), questions); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "references.json"), references); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "config.json"), config); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "guide_images.json"), guideImages); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "schedules.json"), schedules); err != nil {
			return nil, "", err
		}
		if err := addJSONToZip(zw, path.Join(destArchiveDir, "itineraries.json"), itineraries); err != nil {
			return nil, "", err
		}
	}

	if err := zw.Close(); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), fmt.Sprintf("%s.zip", sanitizeZipFilename(plan.Name)), nil
}

func (s *GlobalStore) ImportPlanZip(planID string, zipData []byte) error {
	if _, err := s.findPlanByID(planID); err != nil {
		return err
	}

	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return err
	}

	files := normalizeZipFiles(reader.File)
	if len(files) == 0 {
		return fmt.Errorf("zip file is empty")
	}

	planStore := s.GetPlanStore(planID)
	if err := resetPlanDir(planStore); err != nil {
		return err
	}

	var importedPlan Plan
	hasPlanMeta, err := readZipJSONIfExists(files, "plan.json", &importedPlan)
	if err != nil {
		return err
	}
	if hasPlanMeta {
		currentPlan, err := s.findPlanByID(planID)
		if err != nil {
			return err
		}
		if importedPlan.Name == "" {
			importedPlan.Name = currentPlan.Name
		}
		if err := s.UpdatePlan(planID, Plan{
			Name:        importedPlan.Name,
			Description: importedPlan.Description,
		}); err != nil {
			return err
		}
	}

	var schedule []PlanScheduleItem
	if ok, err := readZipJSONIfExists(files, "plan_schedule.json", &schedule); err != nil {
		return err
	} else if !ok {
		if _, err := readZipJSONIfExists(files, "schedule.json", &schedule); err != nil {
			return err
		}
	}
	if schedule == nil {
		schedule = []PlanScheduleItem{}
	}
	if err := planStore.SaveSchedule(schedule); err != nil {
		return err
	}

	destDirs := findDestinationDirs(files)
	for _, destDir := range destDirs {
		var importedDest Destination
		if ok, err := readZipJSONIfExists(files, path.Join(destDir, "destination.json"), &importedDest); err != nil {
			return err
		} else if !ok {
			importedDest.Name = inferDestinationNameFromDir(destDir)
		}
		if importedDest.Name == "" {
			importedDest.Name = inferDestinationNameFromDir(destDir)
		}
		if importedDest.Name == "" {
			return fmt.Errorf("destination name missing for %s", destDir)
		}

		newDest, err := planStore.CreateDestination(importedDest.Name)
		if err != nil {
			return err
		}
		if err := planStore.UpdateDestination(newDest.ID, Destination{
			Name:  importedDest.Name,
			Order: importedDest.Order,
		}); err != nil {
			return err
		}

		destStore := planStore.GetDestinationStore(newDest.ID)
		imageURLs, err := extractDestinationImages(files, destDir, s.APIPrefix, planID, newDest.ID, destStore.Dir)
		if err != nil {
			return err
		}

		spots, err := readSliceJSON[Spot](files, path.Join(destDir, "spots.json"))
		if err != nil {
			return err
		}
		for i := range spots {
			rewritten, err := rewriteImportedAssetRef(spots[i].Icon, imageURLs)
			if err != nil {
				return fmt.Errorf("%s spots.json: %w", destDir, err)
			}
			spots[i].Icon = rewritten
		}

		foods, err := readSliceJSON[Food](files, path.Join(destDir, "foods.json"))
		if err != nil {
			return err
		}

		routes, err := readSliceJSON[Route](files, path.Join(destDir, "routes.json"))
		if err != nil {
			return err
		}

		questions, err := readSliceJSON[Question](files, path.Join(destDir, "questions.json"))
		if err != nil {
			return err
		}

		references, err := readSliceJSON[Reference](files, path.Join(destDir, "references.json"))
		if err != nil {
			return err
		}
		for i := range references {
			rewritten, err := rewriteImportedAssetRef(references[i].Link, imageURLs)
			if err != nil {
				return fmt.Errorf("%s references.json: %w", destDir, err)
			}
			references[i].Link = rewritten
		}

		config := Config{}
		if _, err := readZipJSONIfExists(files, path.Join(destDir, "config.json"), &config); err != nil {
			return err
		}
		if config.MapImage != "" {
			rewritten, err := rewriteImportedAssetRef(config.MapImage, imageURLs)
			if err != nil {
				return fmt.Errorf("%s config.json: %w", destDir, err)
			}
			config.MapImage = rewritten
		}

		guideImages, err := readSliceJSON[GuideImage](files, path.Join(destDir, "guide_images.json"))
		if err != nil {
			return err
		}
		for i := range guideImages {
			rewritten, err := rewriteImportedAssetRef(guideImages[i].URL, imageURLs)
			if err != nil {
				return fmt.Errorf("%s guide_images.json: %w", destDir, err)
			}
			guideImages[i].URL = rewritten
		}

		schedules, err := readSliceJSON[Schedule](files, path.Join(destDir, "schedules.json"))
		if err != nil {
			return err
		}

		itineraries, err := readSliceJSON[ItineraryItem](files, path.Join(destDir, "itineraries.json"))
		if err != nil {
			return err
		}

		if err := destStore.SaveSpots(spots); err != nil {
			return err
		}
		if err := destStore.SaveFoods(foods); err != nil {
			return err
		}
		if err := destStore.SaveRoutes(routes); err != nil {
			return err
		}
		if err := destStore.SaveQuestions(questions); err != nil {
			return err
		}
		if err := destStore.SaveReferences(references); err != nil {
			return err
		}
		if err := destStore.SaveConfig(config); err != nil {
			return err
		}
		if err := destStore.SaveGuideImages(guideImages); err != nil {
			return err
		}
		if err := destStore.SaveSchedules(schedules); err != nil {
			return err
		}
		if err := destStore.SaveItineraries(itineraries); err != nil {
			return err
		}
	}

	return nil
}

func (s *GlobalStore) findPlanByID(planID string) (Plan, error) {
	plans, err := s.ListPlans()
	if err != nil {
		return Plan{}, err
	}
	for _, plan := range plans {
		if plan.ID == planID {
			return plan, nil
		}
	}
	return Plan{}, fmt.Errorf("plan not found")
}

func addJSONToZip(zw *zip.Writer, filePath string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	writer, err := zw.Create(filePath)
	if err != nil {
		return err
	}
	_, err = writer.Write(data)
	return err
}

func addBytesToZip(zw *zip.Writer, filePath string, data []byte) error {
	writer, err := zw.Create(filePath)
	if err != nil {
		return err
	}
	_, err = writer.Write(data)
	return err
}

func (s *GlobalStore) copyAssetToZipIfNeeded(zw *zip.Writer, destArchiveDir string, sourceURL string, copiedAssets map[string]string, usedImagePaths map[string]bool) (string, error) {
	sourcePath, ok := s.resolveDataFilePath(sourceURL)
	if !ok {
		return "", nil
	}
	if relPath, ok := copiedAssets[sourcePath]; ok {
		return relPath, nil
	}

	data, err := os.ReadFile(sourcePath)
	if err != nil {
		return "", err
	}

	fileName := uniqueArchiveName(filepath.Base(sourcePath), usedImagePaths)
	relPath := path.Join("images", fileName)
	if err := addBytesToZip(zw, path.Join(destArchiveDir, relPath), data); err != nil {
		return "", err
	}
	copiedAssets[sourcePath] = relPath
	return relPath, nil
}

func (s *GlobalStore) resolveDataFilePath(url string) (string, bool) {
	if url == "" || strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return "", false
	}

	dataPrefix := s.APIPrefix
	if !strings.HasSuffix(dataPrefix, "/") {
		dataPrefix += "/"
	}
	dataPrefix += "data/"

	var relPath string
	switch {
	case strings.HasPrefix(url, dataPrefix):
		relPath = strings.TrimPrefix(url, dataPrefix)
	case strings.HasPrefix(url, "/data/"):
		relPath = strings.TrimPrefix(url, "/data/")
	default:
		return "", false
	}

	return filepath.Join(s.Dir, filepath.FromSlash(relPath)), true
}

func sanitizeZipPathSegment(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "destination"
	}
	replacer := strings.NewReplacer("/", "_", "\\", "_", ":", "_", "*", "_", "?", "_", "\"", "_", "<", "_", ">", "_", "|", "_")
	name = replacer.Replace(name)
	name = strings.Trim(name, ". ")
	if name == "" {
		return "destination"
	}
	return name
}

func sanitizeZipFilename(name string) string {
	name = sanitizeZipPathSegment(name)
	if name == "" {
		return "travel-plan"
	}
	return name
}

func uniqueArchiveName(fileName string, used map[string]bool) string {
	fileName = sanitizeZipPathSegment(fileName)
	if fileName == "" {
		fileName = "image"
	}
	ext := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, ext)
	candidate := fileName
	counter := 2
	for used[candidate] {
		candidate = fmt.Sprintf("%s-%d%s", base, counter, ext)
		counter++
	}
	used[candidate] = true
	return candidate
}

func normalizeZipFiles(zipFiles []*zip.File) map[string]*zip.File {
	var cleaned []normalizedZipFile
	for _, file := range zipFiles {
		if file.FileInfo().IsDir() {
			continue
		}
		name := path.Clean(strings.TrimPrefix(file.Name, "/"))
		if name == "." || strings.HasPrefix(name, "__MACOSX/") {
			continue
		}
		cleaned = append(cleaned, normalizedZipFile{name: name, file: file})
	}
	if len(cleaned) == 0 {
		return map[string]*zip.File{}
	}

	commonPrefix := commonZipRoot(cleaned)
	result := make(map[string]*zip.File, len(cleaned))
	for _, item := range cleaned {
		name := item.name
		if commonPrefix != "" {
			name = strings.TrimPrefix(name, commonPrefix)
		}
		result[name] = item.file
	}
	return result
}

func commonZipRoot(files []normalizedZipFile) string {
	if len(files) == 0 {
		return ""
	}
	first := files[0].name
	idx := strings.Index(first, "/")
	if idx <= 0 {
		return ""
	}
	root := first[:idx+1]
	for _, item := range files {
		if !strings.HasPrefix(item.name, root) {
			return ""
		}
	}
	return root
}

func readZipJSONIfExists(files map[string]*zip.File, filePath string, v interface{}) (bool, error) {
	file, ok := files[filePath]
	if !ok {
		return false, nil
	}
	reader, err := file.Open()
	if err != nil {
		return true, err
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return true, err
	}
	if len(data) == 0 {
		return true, nil
	}
	return true, json.Unmarshal(data, v)
}

func readSliceJSON[T any](files map[string]*zip.File, filePath string) ([]T, error) {
	var items []T
	if _, err := readZipJSONIfExists(files, filePath, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []T{}
	}
	return items, nil
}

func resetPlanDir(planStore *PlanStore) error {
	if err := os.RemoveAll(filepath.Join(planStore.Dir, "destinations")); err != nil {
		return err
	}
	if err := os.Remove(filepath.Join(planStore.Dir, "destinations.json")); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := os.Remove(filepath.Join(planStore.Dir, "schedule.json")); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := planStore.EnsureDir(); err != nil {
		return err
	}
	if err := planStore.SaveDestinations([]Destination{}); err != nil {
		return err
	}
	return planStore.SaveSchedule([]PlanScheduleItem{})
}

func findDestinationDirs(files map[string]*zip.File) []string {
	dirs := make(map[string]bool)
	for name := range files {
		base := path.Base(name)
		if zipSectionFiles[base] {
			dir := path.Dir(name)
			if dir != "." {
				dirs[dir] = true
			}
		}
		if idx := strings.Index(name, "/images/"); idx > 0 {
			dirs[name[:idx]] = true
		}
	}
	result := make([]string, 0, len(dirs))
	for dir := range dirs {
		result = append(result, dir)
	}
	sort.Strings(result)
	return result
}

func inferDestinationNameFromDir(dir string) string {
	name := path.Base(dir)
	name = strings.TrimSpace(name)
	for len(name) > 0 && name[0] >= '0' && name[0] <= '9' {
		name = name[1:]
	}
	name = strings.TrimLeft(name, "-_ ")
	return name
}

func extractDestinationImages(files map[string]*zip.File, destDir string, apiPrefix string, planID string, destID string, destStoreDir string) (map[string]string, error) {
	imageURLs := make(map[string]string)
	imageDirPrefix := path.Join(destDir, "images") + "/"

	fsPrefix := apiPrefix
	if !strings.HasSuffix(fsPrefix, "/") {
		fsPrefix += "/"
	}
	fsPrefix += "data/"

	for name, file := range files {
		if !strings.HasPrefix(name, imageDirPrefix) {
			continue
		}
		relPath := strings.TrimPrefix(name, destDir+"/")
		if relPath == "" || relPath == "." {
			continue
		}

		reader, err := file.Open()
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(reader)
		reader.Close()
		if err != nil {
			return nil, err
		}

		targetPath := filepath.Join(destStoreDir, filepath.FromSlash(relPath))
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(targetPath, data, 0644); err != nil {
			return nil, err
		}

		normalizedRelPath := path.Clean(strings.ReplaceAll(relPath, "\\", "/"))
		imageURLs[normalizedRelPath] = fmt.Sprintf("%splans/%s/destinations/%s/%s", fsPrefix, planID, destID, normalizedRelPath)
		if base := path.Base(normalizedRelPath); base != normalizedRelPath {
			imageURLs[base] = imageURLs[normalizedRelPath]
		}
	}
	return imageURLs, nil
}

func rewriteImportedAssetRef(value string, imageURLs map[string]string) (string, error) {
	if value == "" || strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") || strings.HasPrefix(value, "/") {
		return value, nil
	}

	normalized := path.Clean(strings.TrimPrefix(strings.ReplaceAll(value, "\\", "/"), "./"))
	if normalized == "." {
		return "", nil
	}
	if url, ok := imageURLs[normalized]; ok {
		return url, nil
	}
	if !strings.HasPrefix(normalized, "images/") {
		if url, ok := imageURLs[path.Join("images", normalized)]; ok {
			return url, nil
		}
	}
	if strings.HasPrefix(normalized, "images/") || strings.Contains(normalized, "/images/") {
		return "", fmt.Errorf("missing image file for %q", value)
	}
	return value, nil
}
