package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func fixture(t *testing.T, config, text string) string {
	t.Helper()
	folder := t.TempDir()
	for name, content := range map[string]string{"config.md": config, "a.md": text} {
		if err := os.WriteFile(filepath.Join(folder, name), []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
	return folder
}

func TestExportStandaloneAndCLI(t *testing.T) {
	folder := fixture(t, "\uFEFF## order\r\n- a.md\r\n", "# Test\n\n</script><script>alert(1)</script>")
	output := filepath.Join(t.TempDir(), "presentation.html")
	var log bytes.Buffer
	if err := run([]string{folder, "--output", output}, &log, &log); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(output)
	if err != nil {
		t.Fatal(err)
	}
	html := string(data)
	if strings.Count(html, "<script>") != 3 || strings.Count(html, "</script>") != 3 {
		t.Fatal("HTML contains an injected or missing script")
	}
	for _, forbidden := range []string{"<link rel=\"stylesheet\"", "<script defer src=", "<header", "<footer", folder} {
		if strings.Contains(html, forbidden) {
			t.Errorf("unexpected content %q", forbidden)
		}
	}
	if !strings.Contains(html, `\u003c/script\u003e`) {
		t.Fatal("user content must remain escaped inside scripts")
	}
	if strings.Index(html, "<script>") < strings.Index(html, "<noscript>") {
		t.Fatal("scripts must run after the document is parsed")
	}
}

func TestRejectInvalidOrder(t *testing.T) {
	for _, order := range []string{"", "- a.md\n- a.md", "- ../outside.md", "- config.md", "- absent.md", "- /absolute.md", "- C:/absolute.md"} {
		t.Run(order, func(t *testing.T) {
			folder := fixture(t, "## order\n"+order, "# Test")
			if _, err := loadDeck(folder, "Test"); err == nil {
				t.Fatal("invalid order was accepted")
			}
		})
	}
}

func TestOnlyReferencedImagesAreEmbedded(t *testing.T) {
	folder := fixture(t, "## order\n- a.md", "# Test\n![Image](assets/a%20b.svg)\n![Remote](https://example.org/image.png)")
	if err := os.Mkdir(filepath.Join(folder, "assets"), 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"a b.svg", "private.svg"} {
		if err := os.WriteFile(filepath.Join(folder, "assets", name), []byte("<svg/>"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	d, err := loadDeck(folder, "Test")
	if err != nil {
		t.Fatal(err)
	}
	if len(d.Assets) != 1 || !strings.HasPrefix(d.Assets["assets/a b.svg"], "data:image/svg+xml;base64,") {
		t.Fatal("only the referenced local image should be embedded")
	}
}

func TestRejectEscapingSymlink(t *testing.T) {
	folder := fixture(t, "## order\n- link.md", "# Test")
	outside := fixture(t, "", "# Outside")
	if err := os.Symlink(filepath.Join(outside, "a.md"), filepath.Join(folder, "link.md")); err != nil {
		t.Skip("symlink creation is not supported")
	}
	if _, err := loadDeck(folder, "Test"); err == nil {
		t.Fatal("external symlink accepted")
	}
}

func TestCLIHelpVersionAndFailure(t *testing.T) {
	for _, args := range [][]string{{"--help"}, {"--version"}} {
		var out bytes.Buffer
		if err := run(args, &out, &out); err != nil || out.Len() == 0 {
			t.Fatalf("help/version failed: %v", err)
		}
	}
	var out bytes.Buffer
	for _, args := range [][]string{{"--unknown"}, {"a", "b"}, {"--output", "config.md"}} {
		if err := run(args, &out, &out); err == nil {
			t.Fatalf("invalid arguments accepted: %v", args)
		}
	}
}

func TestDemo(t *testing.T) {
	d, err := loadDeck(".", "Démo intégrée")
	if err != nil {
		t.Fatal(err)
	}
	if len(d.Slides) != 10 || len(d.Assets) != 10 {
		t.Fatalf("unexpected demo size: %d slides, %d images", len(d.Slides), len(d.Assets))
	}
}
