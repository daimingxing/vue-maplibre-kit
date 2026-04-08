# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

`vue-maplibre-kit` is a Vue 3 component library that wraps MapLibre GL JS with a plugin-based architecture. It provides a unified map container (`MapLibreInit`) that manages map controls, drawing/measurement tools (via TerraDraw), layer interactions, and extensible plugins. The library is published as an ES module with multiple entry points.

## Commands

- **Dev server**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (runs `vue-tsc -b && vite build` — type-checks then builds library)
- **Preview**: `npm run preview`
- No test runner or linter is configured.

## Build Configuration

Vite library mode with multiple entry points:
- `src/index.ts` → main entry (MapLibreInit component + core types)
- `src/geometry.ts` → geometry utilities (line extension, corridor, measurement tools)
- `src/plugins/map-feature-snap.ts` → snap plugin (re-exports from `src/MapLibre/plugins/map-feature-snap/`)
- `src/plugins/line-draft-preview.ts` → line draft preview plugin (re-exports from `src/MapLibre/plugins/line-draft-preview/`)

External dependencies (not bundled): vue, maplibre-gl, vue-maplibre-gl, terra-draw, @watergis/maplibre-gl-terradraw, element-plus, geojson, mitt, lodash-es.

Path alias: `@/` → `./src/`

## Architecture

### Core Container — `src/MapLibre/core/mapLibre-init.vue`

The central component. It:
1. Mounts the MapLibre GL map via `vue-maplibre-gl`'s `MglMap`
2. Manages standard map controls (navigation, fullscreen, scale, etc.) via `controls` prop
3. Hosts TerraDraw drawing and measurement controls (`MaplibreTerradrawControl`, `MaplibreMeasureControl`)
4. Manages line decoration layers for draw/measure tools
5. Delegates to the **plugin host** for extensible capabilities

Props: `mapKey`, `mapOptions`, `controls`, `mapInteractive`, `plugins`

### Plugin System — `src/MapLibre/plugins/types.ts` + `src/MapLibre/core/useMapPluginHost.ts`

Plugins are defined with `defineMapPlugin()` and registered via the `plugins` prop on `MapLibreInit`. Each plugin:
- Has a `type` string and `createInstance(context)` factory
- Receives a `MapPluginContext` with access to map instance, options, and interaction state
- Returns a `MapPluginInstance` that can contribute: render items (Vue components injected into the map), map interactive patches, snap services, API, and reactive state

The plugin host (`useMapPluginHost`) manages plugin lifecycle (create/reuse/destroy), aggregates render items and interaction patches, and exposes a query interface (`MapPluginHostExpose`).

Built-in plugins:
- **map-feature-snap** (`src/MapLibre/plugins/map-feature-snap/`): Provides snap-to-feature capability for map layers and TerraDraw tools. Contributes a `mapSnap` service.
- **line-draft-preview** (`src/MapLibre/plugins/line-draft-preview/`): Manages temporary line/corridor draft previews with their own data source and rendering.

### Layer Interaction — `src/MapLibre/composables/useMapInteractive.ts`

Unified hover/click/select management for regular map layers. Handles feature-state hover/selected, cursor changes, snap integration, and event delegation with priority ordering.

### Key Patterns

- **Chinese comments**: All code comments and JSDoc are written in Chinese (Simplified).
- **Composable pattern**: Business logic is extracted into `use*` composables and `create*` factory functions.
- **ShallowRef for instances**: Control refs and plugin records use `shallowRef` to avoid deep reactivity on complex objects.
- **Descriptor-based plugin registration**: Plugins are passed as descriptor arrays, enabling dynamic add/remove with instance reuse when type+definition unchanged.
- **TerraDraw mode instantiation**: Mode config objects are deep-merged then manually instantiated into TerraDraw mode classes (TerraDrawLineStringMode, etc.).

## TypeScript

- Solution-style tsconfig: `tsconfig.json` references `tsconfig.app.json` (source) and `tsconfig.node.json` (vite config)
- Strict unused checks enabled (`noUnusedLocals`, `noUnusedParameters`)
- Uses `@vue/tsconfig/tsconfig.dom.json` as base for app config

## File Organization

```
src/
  index.ts                    # Main library entry
  geometry.ts                 # Geometry utilities entry
  plugins/                    # Thin re-export entry points for tree-shaking
  MapLibre/
    core/                     # MapLibreInit component + plugin host
    plugins/                  # Plugin implementations (each in own directory)
      types.ts                # Core plugin type system
      map-feature-snap/       # Snap plugin
      line-draft-preview/     # Line draft preview plugin
    composables/              # Shared composables (useMapInteractive, useMapEffect, useMapDataUpdate)
    shared/                   # Shared types and utilities
    terradraw/                # TerraDraw integration (config, interaction, line decoration)
  views/                      # Demo/dev views (not part of library build)
docs/                         # Knowledge base references for MapLibre, TerraDraw, vue-maplibre-gl
```
