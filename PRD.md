# Planning Guide

A professional web application that automatically detects, analyzes, normalizes, and converts geographic coordinates from various file formats to UTM Zone 30 format, optimized for QGIS and similar GIS applications.

**Experience Qualities**: 
1. **Precise** - The application must handle coordinate transformations with professional-grade accuracy for GIS workflows
2. **Efficient** - Fast file processing with clear progress indicators and immediate feedback on coordinate detection
3. **Trustworthy** - Transparent information about detected coordinate systems and validation before conversion

**Complexity Level**: Light Application (multiple features with basic state)
  - Handles file upload, coordinate detection, transformation, and download - but focused on a single primary workflow without complex user accounts or advanced state management

## Essential Features

### File Upload & Detection
- **Functionality**: Accepts multiple file formats (CSV, Excel, DOC, ODT) and automatically detects coordinate columns
- **Purpose**: Eliminates manual configuration and supports diverse professional workflows
- **Trigger**: User drags file or clicks upload button
- **Progression**: File selection → Upload → Automatic parsing → Coordinate column detection → Display results
- **Success criteria**: Successfully parses CSV, Excel files and identifies coordinate pairs with 95%+ accuracy

### Coordinate Analysis & Normalization
- **Functionality**: Identifies coordinate system (Geographic, UTM, etc.), validates data quality, and normalizes format
- **Purpose**: Ensures data integrity before transformation and provides transparency
- **Trigger**: Automatic after file upload and detection
- **Progression**: Raw coordinates → System detection → Format normalization → Validation → Display statistics
- **Success criteria**: Correctly identifies common coordinate systems (WGS84, ETRS89, ED50) and reports validation issues

### UTM30 Conversion
- **Functionality**: Transforms detected coordinates to UTM Zone 30N format with QGIS-compatible structure
- **Purpose**: Standardizes coordinates for professional GIS applications
- **Trigger**: Automatic after analysis, with user confirmation
- **Progression**: Normalized coordinates → UTM30 transformation → Quality check → CSV generation
- **Success criteria**: Accurate transformations within 1m precision, proper CSV formatting for QGIS import

### Information Display
- **Functionality**: Shows original coordinate system, sample data, row counts, detected columns, and conversion summary
- **Purpose**: Provides transparency and allows user validation before download
- **Trigger**: Updates at each processing stage
- **Progression**: File info → Detected system → Sample preview → Conversion statistics → Download ready
- **Success criteria**: Clear presentation of all relevant metadata and transformation details

### Download with Smart Naming
- **Functionality**: Generates CSV file with original filename + "_UTM30" suffix, triggers browser download
- **Purpose**: Maintains file organization and indicates transformation status
- **Trigger**: User clicks download button after successful conversion
- **Progression**: Click download → Browser save dialog → User selects location → File saved
- **Success criteria**: Correct filename format, valid CSV structure, browser download initiated

## Edge Case Handling
- **Mixed coordinate formats**: Detect and warn if multiple coordinate systems exist in single file
- **Invalid coordinates**: Flag out-of-range values and provide row-level error reporting
- **Missing data**: Handle null/empty cells gracefully with clear reporting
- **Large files**: Show progress indicator for files with 10,000+ rows
- **Unsupported formats**: Clear error message with supported format list
- **Ambiguous column names**: Allow manual column selection if auto-detection uncertain

## Design Direction
The design should feel professional, precise, and efficient - like a technical tool built for GIS professionals. Clean and focused interface with emphasis on data clarity and processing transparency. Minimal distractions with purposeful use of space to display technical information clearly.

## Color Selection
Complementary (opposite colors) - Professional blue paired with warm orange for actions, creating technical sophistication with approachable interactivity.

- **Primary Color**: Deep Professional Blue (oklch(0.45 0.15 250)) - Communicates precision, technical competence, and geographic/mapping associations
- **Secondary Colors**: Cool Gray (oklch(0.65 0.02 250)) for secondary actions and backgrounds, maintaining professional aesthetic
- **Accent Color**: Warm Orange (oklch(0.68 0.18 45)) - Highlights conversion actions and important status information
- **Foreground/Background Pairings**:
  - Background (Cool White oklch(0.98 0.01 250)): Dark Text (oklch(0.25 0.02 250)) - Ratio 12.1:1 ✓
  - Card (White oklch(1 0 0)): Dark Text (oklch(0.25 0.02 250)) - Ratio 13.5:1 ✓
  - Primary (Deep Blue oklch(0.45 0.15 250)): White Text (oklch(1 0 0)) - Ratio 7.8:1 ✓
  - Secondary (Cool Gray oklch(0.65 0.02 250)): Dark Text (oklch(0.25 0.02 250)) - Ratio 4.6:1 ✓
  - Accent (Warm Orange oklch(0.68 0.18 45)): Dark Text (oklch(0.25 0.02 250)) - Ratio 5.2:1 ✓
  - Muted (Light Gray oklch(0.95 0.01 250)): Medium Text (oklch(0.50 0.02 250)) - Ratio 6.2:1 ✓

## Font Selection
Technical clarity with professional polish - using Inter for its excellent readability at all sizes and technical/modern character, perfect for displaying coordinate data and technical information.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter SemiBold/32px/tight letter spacing/-0.02em
  - H2 (Section Headers): Inter SemiBold/24px/normal/-0.01em
  - H3 (Subsections): Inter Medium/18px/normal/0em
  - Body (General Text): Inter Regular/15px/relaxed/0em
  - Caption (Metadata): Inter Regular/13px/normal/0em
  - Code (Coordinates): JetBrains Mono Regular/14px/normal/0em - for displaying coordinate values with monospace clarity

## Animations
Subtle and functional - animations should reinforce the sense of professional tool efficiency, not entertainment. Processing states and data flow transitions are animated to communicate system status and maintain user confidence during coordinate transformations.

- **Purposeful Meaning**: Upload → Process → Convert flow animations reinforce the data transformation pipeline
- **Hierarchy of Movement**: 
  1. File upload drop zone pulse on drag-over (immediate feedback)
  2. Processing spinner during detection/conversion (status communication)
  3. Smooth transitions between stages (workflow clarity)
  4. Success checkmark animation on completion (confirmation)

## Component Selection
- **Components**: 
  - Card: Main container for upload area and results display
  - Button: Primary for "Download CSV", secondary for "New Conversion"
  - Table: Display coordinate samples and statistics with proper alignment
  - Badge: Show detected coordinate system type and file format
  - Progress: Visual indicator for large file processing
  - Alert: Display warnings for validation issues or errors
  - Separator: Divide sections (upload, analysis, results)
  - Tabs: Switch between "File Info", "Original Data", "Converted Data" views
  
- **Customizations**: 
  - Custom drag-and-drop upload zone with file type icons
  - Coordinate display component with monospace font for precise alignment
  - Custom statistics cards showing row counts, coordinate bounds, etc.
  
- **States**: 
  - Upload Button: Hover shows file type hints, active state during file selection
  - Download Button: Disabled until conversion complete, success state with checkmark
  - Drop Zone: Neutral → Drag-over highlight → Processing → Success/Error
  - Table Rows: Hover highlight for data inspection
  
- **Icon Selection**: 
  - UploadSimple: Main upload action
  - FileCsv, FileXls, FileDoc: File type indicators
  - MapPin, Globe: Coordinate system indicators
  - CheckCircle: Successful conversion
  - Warning: Validation issues
  - DownloadSimple: Download action
  - ArrowsClockwise: New conversion
  
- **Spacing**: 
  - Card padding: p-6
  - Section gaps: gap-6
  - Element spacing: gap-4
  - Tight groups: gap-2
  - Table cells: px-4 py-2
  
- **Mobile**: 
  - Single column layout on mobile (<768px)
  - Reduced table columns showing only essential data
  - Stacked info cards instead of grid
  - Full-width upload zone with touch-friendly size
  - Sticky download button at bottom on mobile
