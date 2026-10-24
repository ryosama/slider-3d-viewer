package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestArchivesContainExecutableWithoutPersonalMetadata(t *testing.T) {
	for _, windows := range []bool{false, true} {
		dir := t.TempDir()
		source := filepath.Join(dir, "source")
		if err := os.WriteFile(source, []byte("executable"), 0644); err != nil {
			t.Fatal(err)
		}
		archive := filepath.Join(dir, "archive")
		if err := pack(archive, map[string]string{"export": source}, "export", windows); err != nil {
			t.Fatal(err)
		}
		var reader io.Reader
		if windows {
			z, err := zip.OpenReader(archive)
			if err != nil {
				t.Fatal(err)
			}
			defer z.Close()
			if len(z.File) != 1 || z.File[0].Name != "export" || z.File[0].Comment != "" {
				t.Fatal("unexpected ZIP metadata")
			}
			r, err := z.File[0].Open()
			if err != nil {
				t.Fatal(err)
			}
			defer r.Close()
			reader = r
		} else {
			f, err := os.Open(archive)
			if err != nil {
				t.Fatal(err)
			}
			defer f.Close()
			g, err := gzip.NewReader(f)
			if err != nil {
				t.Fatal(err)
			}
			defer g.Close()
			if g.Name != "" || g.Comment != "" {
				t.Fatal("unexpected gzip metadata")
			}
			r := tar.NewReader(g)
			h, err := r.Next()
			if err != nil {
				t.Fatal(err)
			}
			if h.Name != "export" || h.Mode != 0755 || h.Uname != "" || h.Gname != "" || h.Uid != 0 || h.Gid != 0 {
				t.Fatal("unexpected tar metadata")
			}
			reader = r
		}
		data, err := io.ReadAll(reader)
		if err != nil || string(data) != "executable" {
			t.Fatal("archive content differs")
		}
	}
}
