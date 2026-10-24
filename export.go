// Orbite exports Markdown presentations as a single offline HTML file.
package main

import (
	"embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

//go:embed src/template.html src/style.css src/core.js src/app.js
var player embed.FS

var version = "dev"
var headingPattern = regexp.MustCompile(`(?i)^#{1,6}\s+(order|theme|transition)\s*$`)
var listPattern = regexp.MustCompile(`^\s*-\s+(.+?)\s*$`)
var titlePattern = regexp.MustCompile(`(?m)^#\s+(.+)$`)
var imagePattern = regexp.MustCompile(`!\[[^\]]*\]\(([^\s)]+)\)`)
var scriptEndPattern = regexp.MustCompile(`(?i)</script`)
var drivePattern = regexp.MustCompile(`^[a-zA-Z]:`)

type slide struct {
	Path  string `json:"path"`
	Text  string `json:"text"`
	Title string `json:"title"`
}

type deck struct {
	Label  string            `json:"label"`
	Config string            `json:"config"`
	Slides []slide           `json:"slides"`
	Assets map[string]string `json:"assets"`
}

func readText(path string) (string, error) {
	data, err := os.ReadFile(path)
	return strings.TrimPrefix(string(data), "\uFEFF"), err
}

// localFile validates both the written path and its symlink destination.
func localFile(root, name string) (string, string, error) {
	name = strings.ReplaceAll(name, `\`, "/")
	if strings.HasPrefix(name, "/") || drivePattern.MatchString(name) {
		return "", "", fmt.Errorf("chemin absolu interdit : %s", name)
	}
	clean := filepath.Clean(filepath.FromSlash(name))
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", "", fmt.Errorf("chemin en dehors du dossier : %s", name)
	}
	resolved, err := filepath.EvalSymlinks(filepath.Join(root, clean))
	if err != nil {
		return "", "", fmt.Errorf("fichier introuvable : %s", name)
	}
	relative, err := filepath.Rel(root, resolved)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", "", fmt.Errorf("lien symbolique en dehors du dossier : %s", name)
	}
	return resolved, filepath.ToSlash(clean), nil
}

func loadDeck(folder, label string) (deck, error) {
	d := deck{Label: label, Assets: map[string]string{}}
	root, err := filepath.Abs(folder)
	if err != nil {
		return d, errors.New("dossier invalide")
	}
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return d, errors.New("dossier introuvable")
	}
	configPath, _, err := localFile(root, "config.md")
	if err != nil {
		return d, err
	}
	d.Config, err = readText(configPath)
	if err != nil {
		return d, errors.New("lecture de config.md impossible")
	}
	section := ""
	var order []string
	for _, line := range strings.Split(strings.ReplaceAll(d.Config, "\r", ""), "\n") {
		if heading := headingPattern.FindStringSubmatch(line); heading != nil {
			section = strings.ToLower(heading[1])
		} else if strings.HasPrefix(line, "#") {
			section = ""
		} else if item := listPattern.FindStringSubmatch(line); section == "order" && item != nil {
			order = append(order, strings.Trim(item[1], "`"))
		}
	}
	if len(order) == 0 {
		return d, errors.New("la section order de config.md est vide")
	}
	seen := map[string]bool{}
	mimes := map[string]string{".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif"}
	for _, name := range order {
		file, relative, err := localFile(root, name)
		if err != nil {
			return d, err
		}
		if strings.ToLower(filepath.Ext(relative)) != ".md" || strings.EqualFold(relative, "config.md") {
			return d, fmt.Errorf("diapositive invalide : %s", name)
		}
		if seen[relative] {
			return d, fmt.Errorf("diapositive en double : %s", name)
		}
		seen[relative] = true
		text, err := readText(file)
		if err != nil {
			return d, fmt.Errorf("lecture impossible : %s", name)
		}
		title := strings.TrimSuffix(filepath.Base(relative), filepath.Ext(relative))
		if match := titlePattern.FindStringSubmatch(text); match != nil {
			title = strings.TrimSpace(match[1])
		}
		d.Slides = append(d.Slides, slide{relative, text, title})
		for _, match := range imagePattern.FindAllStringSubmatch(text, -1) {
			u, err := url.Parse(match[1])
			if err != nil {
				return d, fmt.Errorf("chemin d’image invalide : %s", match[1])
			}
			if u.IsAbs() || u.Host != "" {
				continue // The offline player never requests remote images.
			}
			if strings.HasPrefix(u.Path, "/") || drivePattern.MatchString(u.Path) {
				return d, fmt.Errorf("chemin d’image absolu interdit : %s", match[1])
			}
			imageName := filepath.Join(filepath.Dir(relative), filepath.FromSlash(u.Path))
			imageFile, imageRelative, err := localFile(root, imageName)
			if err != nil {
				return d, err
			}
			mime := mimes[strings.ToLower(filepath.Ext(imageRelative))]
			if mime == "" {
				return d, fmt.Errorf("format d’image non pris en charge : %s", imageRelative)
			}
			if _, exists := d.Assets[imageRelative]; exists {
				continue
			}
			data, err := os.ReadFile(imageFile)
			if err != nil {
				return d, fmt.Errorf("lecture impossible : %s", imageRelative)
			}
			d.Assets[imageRelative] = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		}
	}
	return d, nil
}

func demoScript(d deck) (string, error) {
	data, err := json.Marshal(d) // Escapes '<', including hostile closing script tags.
	return "window.ORBITE_DEMO = " + string(data) + ";\n", err
}

func renderHTML(demo string) (string, error) {
	template, err := player.ReadFile("src/template.html")
	if err != nil {
		return "", err
	}
	css, err := player.ReadFile("src/style.css")
	if err != nil {
		return "", err
	}
	html := strings.Replace(string(template), `<link rel="stylesheet" href="src/style.css">`, "<style>"+string(css)+"</style>", 1)
	var scripts []string
	for _, name := range []string{"core", "demo", "app"} {
		script := demo
		if name != "demo" {
			data, err := player.ReadFile("src/" + name + ".js")
			if err != nil {
				return "", err
			}
			script = string(data)
		}
		html = strings.Replace(html, `<script defer src="src/`+name+`.js"></script>`, "", 1)
		script = scriptEndPattern.ReplaceAllStringFunc(script, func(s string) string { return "<\\/" + s[2:] })
		scripts = append(scripts, "<script>"+script+"</script>")
	}
	return strings.Replace(html, "</body>", strings.Join(scripts, "\n")+"\n</body>", 1), nil
}

func writeOutput(path, content string) error {
	file, err := os.CreateTemp(filepath.Dir(path), ".orbite-*")
	if err != nil {
		return errors.New("impossible de créer le fichier de sortie ; vérifiez son dossier")
	}
	temp := file.Name()
	defer os.Remove(temp)
	if _, err = io.WriteString(file, content); err != nil {
		file.Close()
		return errors.New("écriture du fichier de sortie impossible")
	}
	if err = file.Close(); err != nil {
		return err
	}
	if err = os.Chmod(temp, 0644); err != nil {
		return err
	}
	if err = os.Rename(temp, path); err != nil {
		return errors.New("impossible de remplacer le fichier de sortie")
	}
	return nil
}

func run(args []string, stdout, stderr io.Writer) error {
	flags := flag.NewFlagSet("orbite-export", flag.ContinueOnError)
	flags.SetOutput(stderr)
	output := flags.String("output", "presentation.html", "Fichier HTML autonome à créer")
	demoJS := flags.String("demo-js", "", "Écrit aussi le paquet JavaScript de démonstration")
	label := flags.String("label", "Présentation", "Titre générique de la collection")
	showVersion := flags.Bool("version", false, "Affiche la version")
	flags.Usage = func() {
		fmt.Fprintln(stderr, "Usage : orbite-export [options] [dossier]\nCrée un HTML autonome. Dossier par défaut : répertoire courant.")
		flags.PrintDefaults()
	}
	// Accept options before or after the single positional folder.
	var options, folders []string
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			folders = append(folders, args[i+1:]...)
			break
		}
		if strings.HasPrefix(a, "-") {
			options = append(options, a)
			key := strings.TrimLeft(a, "-")
			if (key == "output" || key == "demo-js" || key == "label") && i+1 < len(args) {
				i++
				options = append(options, args[i])
			}
		} else {
			folders = append(folders, a)
		}
	}
	if err := flags.Parse(options); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}
	if *showVersion {
		fmt.Fprintln(stdout, "orbite-export "+version)
		return nil
	}
	if len(folders) > 1 {
		return errors.New("un seul dossier est accepté")
	}
	folder := "."
	if len(folders) == 1 {
		folder = folders[0]
	}
	if !strings.EqualFold(filepath.Ext(*output), ".html") {
		return errors.New("le fichier de sortie doit avoir l’extension .html")
	}
	if *demoJS != "" && !strings.EqualFold(filepath.Ext(*demoJS), ".js") {
		return errors.New("le paquet de démonstration doit avoir l’extension .js")
	}
	d, err := loadDeck(folder, *label)
	if err != nil {
		return err
	}
	demo, err := demoScript(d)
	if err != nil {
		return err
	}
	html, err := renderHTML(demo)
	if err != nil {
		return err
	}
	if *demoJS != "" {
		if err := writeOutput(*demoJS, demo); err != nil {
			return err
		}
	}
	if err := writeOutput(*output, html); err != nil {
		return err
	}
	fmt.Fprintf(stdout, "Présentation créée : %d diapositives, %d images.\n", len(d.Slides), len(d.Assets))
	return nil
}

func main() {
	if err := run(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, "Erreur :", err)
		os.Exit(1)
	}
}
