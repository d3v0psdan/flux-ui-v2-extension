# Changelog

All notable changes to the "Flux UI v2" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

- Initial release with support for Flux UI v2.x components
- Component autocomplete on `<flux:` prefix
- Prop suggestions with type hints and default values
- Support for all 44+ Flux UI components including:
  - New v2 components: `composer`, `select`, `otp-input`, `pillbox`, `skeleton`, `slider`, `kanban`
  - Nested components (e.g., `modal.trigger`, `select.option`, `kanban.card`)
  - Flux Pro components: `chart`, `editor`, `kanban`
- Livewire/Alpine attribute suggestions
- Configuration options:
  - Enable/disable extension
  - Include/exclude Flux Pro components
- Update script for syncing with Flux source files

### Component Support

#### Free Components
- accordion (+ item, heading, content)
- autocomplete (+ item, empty)
- avatar
- badge
- brand
- breadcrumbs (+ item)
- button (+ group)
- calendar
- callout
- card
- checkbox (+ group)
- command (+ input, item)
- composer
- context (+ button, item)
- date-picker
- dropdown (+ button, item, separator, heading)
- field
- file-upload
- heading
- icon (+ loading)
- input
- modal (+ trigger, close)
- navbar (+ item)
- otp-input
- pagination
- pillbox
- popover (+ trigger, close)
- profile
- radio (+ group)
- select (+ button, input, search, option, option.empty)
- separator
- skeleton
- slider
- switch
- table (+ column, row, cell)
- tabs (+ tab, panel)
- text
- textarea
- time-picker
- toast
- tooltip

#### Pro Components
- chart
- editor
- kanban (+ column, column.header, column.cards, card)
- select.option.create
