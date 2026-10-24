// Build portable Linux and Windows release archives from the repository root.
package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

func main() {
	version := flag.String("version", "v0.1.0", "Release tag (vX.Y.Z)")
	out := flag.String("out", "dist", "Output directory")
	flag.Parse()
	if err := release(*version, *out); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func release(version, out string) error {
	if !regexp.MustCompile(`^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$`).MatchString(version) {
		return fmt.Errorf("version invalide")
	}
	dir := filepath.Join(out, version)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	var artifacts []string
	for _, target := range []string{"linux", "windows"} {
		name, entry := "orbite-export-"+target+"-amd64", "orbite-export"
		if target == "windows" {
			name += ".exe"
			entry += ".exe"
		}
		binary := filepath.Join(dir, name)
		cmd := exec.Command("go", "build", "-trimpath", "-buildvcs=false", "-ldflags=-s -w -buildid= -X main.version="+version, "-o", binary, ".")
		cmd.Env = append(os.Environ(), "CGO_ENABLED=0", "GOOS="+target, "GOARCH=amd64")
		cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
		if err := cmd.Run(); err != nil {
			return err
		}
		files := map[string]string{entry: binary, "README.md": "README.md", "PUBLISHING.md": "PUBLISHING.md", "RELEASE_NOTES.md": "RELEASE_NOTES.md", "config.md": "config.md", "index.html": "index.html"}
		for _, folder := range []string{"slides", "assets"} {
			if err := filepath.WalkDir(folder, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if d.Type()&os.ModeSymlink != 0 {
					return fmt.Errorf("lien symbolique interdit : %s", path)
				}
				if !d.IsDir() {
					files[filepath.ToSlash(path)] = path
				}
				return nil
			}); err != nil {
				return err
			}
		}
		archive := filepath.Join(dir, "slider-3d-viewer-"+version+"-"+target+"-amd64")
		if target == "windows" {
			archive += ".zip"
		} else {
			archive += ".tar.gz"
		}
		if err := pack(archive, files, entry, target == "windows"); err != nil {
			return err
		}
		artifacts = append(artifacts, binary, archive)
	}
	sort.Strings(artifacts)
	var sums strings.Builder
	for _, path := range artifacts {
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		fmt.Fprintf(&sums, "%x  %s\n", sha256.Sum256(data), filepath.Base(path))
	}
	if err := os.WriteFile(filepath.Join(dir, "SHA256SUMS"), []byte(sums.String()), 0644); err != nil {
		return err
	}
	fmt.Println("Release préparée :", dir)
	return nil
}

func pack(path string, files map[string]string, executable string, windows bool) (err error) {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer func() {
		if e := f.Close(); err == nil {
			err = e
		}
	}()
	var names []string
	for name := range files {
		names = append(names, name)
	}
	sort.Strings(names)
	var zw *zip.Writer
	var tw *tar.Writer
	if windows {
		zw = zip.NewWriter(f)
		defer func() {
			if e := zw.Close(); err == nil {
				err = e
			}
		}()
	} else {
		gz := gzip.NewWriter(f)
		defer func() {
			if e := gz.Close(); err == nil {
				err = e
			}
		}()
		tw = tar.NewWriter(gz)
		defer func() {
			if e := tw.Close(); err == nil {
				err = e
			}
		}()
	}
	for _, name := range names {
		data, err := os.ReadFile(files[name])
		if err != nil {
			return err
		}
		mode := int64(0644)
		if name == executable {
			mode = 0755
		}
		var writer io.Writer
		if windows {
			h := &zip.FileHeader{Name: name, Method: zip.Deflate}
			h.SetMode(os.FileMode(mode))
			writer, err = zw.CreateHeader(h)
		} else {
			err = tw.WriteHeader(&tar.Header{Name: name, Mode: mode, Size: int64(len(data)), Typeflag: tar.TypeReg})
			writer = tw
		}
		if err != nil {
			return err
		}
		if _, err := io.Copy(writer, bytes.NewReader(data)); err != nil {
			return err
		}
	}
	return nil
}
