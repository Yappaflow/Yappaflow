# Changelog

All notable changes to `yappaflow-ui` will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `ScrambleText` motion primitive — per-character scramble-and-settle animation, GSAP-driven, SSR-safe, reduced-motion aware. Re-exported from the root barrel and from `yappaflow-ui/motion`.
- Gallery and docs coverage for every public component (primitives, motion, shell, exhibits, theme).
- `publishConfig`, `repository`, `homepage`, and `bugs` package metadata for public npm.
- `prepack` / `prepublishOnly` scripts so the tarball is always a fresh, typechecked build.

### Changed
- README rewritten for a public-npm audience with install, quick start, and layer overview.

## [0.1.0]

Initial architecture release — tokens, motion engine (GSAP + Lenis), primitives, shell, and the first exhibit (`ExhibitHero`). Published as the design vocabulary behind Yappaflow's AI site generator.
