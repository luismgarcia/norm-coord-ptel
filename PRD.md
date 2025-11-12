# Planning Guide

A professional web application that automatically detects, analyzes, normalizes, and converts geographic coordinates from various file formats to UTM Zone 30 format, optimized for QGIS and similar GIS applications.

**Experience Qualities**: 
1. **Precise** - The application must handle coordinate transformations with professional-grade accuracy for GIS workflows
2. **Efficient** - Fast file processing with clear progress indicators and immediate feedback on coordinate detection
3. **Trustworthy** - Transparent information about detected coordinate systems and validation before conversion

**Complexity Level**: Light Application (multiple features with basic state)
  - Handles file upload, coordinate detection, transformation, and download - but focused on a single primary workflow without complex user accounts or advanced state management

## Essential Features

### File Upload & Detection (Multi-File Support)
- **Functionality**: Accepts multiple files simultaneously in various formats (CSV, Excel XLS/XLSX/XLSM/XLSB, OpenDocument ODS/FODS, Word DOC/DOCX, OpenDocument Text ODT, RTF, TXT) and automatically detects coordinate columns in each file
- **Purpose**: Eliminates manual configuration and supports batch processing of diverse professional workflows across all major document formats, enabling efficient mass coordinate conversion
- **Trigger**: User drags one or multiple files or clicks upload button to select multiple files
- **Progression**: Multiple file selection → Sequential upload & processing → Automatic parsing for each → Coordinate column detection per file → Display all processed files with individual management
- **Success criteria**: Successfully parses all supported formats, identifies coordinate pairs with 95%+ accuracy, processes multiple files sequentially without data loss, and maintains individual file state for review and download

### Coordinate Analysis & Normalization
- **Functionality**: Identifies coordinate system from 15+ supported formats (WGS84, ETRS89, ED50, Web Mercator, Lambert 93, etc.), detects and corrects coordinate formatting errors, normalizes inconsistent decimal separators (commas vs periods), removes invalid characters, converts DMS (degrees/minutes/seconds) format to decimal, and validates data quality
- **Purpose**: Ensures data integrity before transformation, handles real-world messy data automatically, and provides transparency about corrections made
- **Trigger**: Automatic after file upload and detection
- **Progression**: Raw coordinates → Character cleaning → Decimal normalization → DMS conversion → System detection → Format validation → Display statistics with normalization count
- **Success criteria**: Correctly identifies 15+ coordinate systems across different zones and datums, successfully normalizes coordinates with format errors (incorrect decimals, special characters, DMS notation), reports validation issues with detailed error messages

### UTM30 Conversion
- **Functionality**: Transforms detected coordinates to UTM Zone 30N format with QGIS-compatible structure
- **Purpose**: Standardizes coordinates for professional GIS applications
- **Trigger**: Automatic after analysis, with user confirmation
- **Progression**: Normalized coordinates → UTM30 transformation → Quality check → CSV generation
- **Success criteria**: Accurate transformations within 1m precision, proper CSV formatting for QGIS import

### Information Display
- **Functionality**: Shows detected coordinate system (from 15+ supported systems including multiple UTM zones, datums, and projections), sample data, row counts, detected columns, normalization statistics, and conversion summary
- **Purpose**: Provides transparency about automatic corrections and allows user validation before download
- **Trigger**: Updates at each processing stage
- **Progression**: File info → Detected system (with zone info) → Normalization report → Sample preview → Conversion statistics → Download ready
- **Success criteria**: Clear presentation of all relevant metadata, transformation details, and count of normalized coordinates with visual indicators

### Download with Smart Naming & Batch Export
- **Functionality**: Generates CSV file with original filename + "_UTM30" suffix, triggers browser download. Supports downloading individual files or batch downloading all processed files at once
- **Purpose**: Maintains file organization and indicates transformation status. Enables efficient bulk export of multiple converted coordinate files
- **Trigger**: User clicks download button for individual file or "Download All" button for batch export after successful conversion
- **Progression**: Click download → Browser save dialog → User selects location → File(s) saved
- **Success criteria**: Correct filename format, valid CSV structure, browser download initiated for single or multiple files

## Edge Case Handling
- **Mixed coordinate formats**: Detect and warn if multiple coordinate systems exist in single file
- **Invalid coordinates**: Flag out-of-range values and provide row-level error reporting with specific error descriptions
- **Malformed coordinates**: Automatically normalize coordinates with incorrect decimal separators, extra spaces, special characters, or non-standard encoding
- **DMS format coordinates**: Automatically convert degrees/minutes/seconds notation (e.g., "40° 25' 30\" N") to decimal format
- **Missing data**: Handle null/empty cells gracefully with clear reporting
- **Large files**: Show progress indicator for files with 10,000+ rows
- **Unsupported formats**: Clear error message with supported format list (CSV, XLS/XLSX/XLSM/XLSB, ODS/FODS, DOC/DOCX, ODT, RTF, TXT)
- **Ambiguous column names**: Allow manual column selection if auto-detection uncertain
- **Document tables**: Extract tabular data from document formats, fallback to text parsing when native table extraction fails
- **Multiple delimiters**: Auto-detect delimiter type in text files (tabs, commas, semicolons, pipes, spaces)
- **Zone detection**: Automatically detect correct UTM zone (29, 30, 31) based on coordinate ranges for accurate conversions
- **Character encoding issues**: Strip non-numeric characters while preserving coordinate format indicators
- **Multiple file processing**: Handle sequential processing of multiple files without state conflicts or data loss
- **File management**: Allow individual file removal from batch without affecting other processed files
- **Memory management**: Process files sequentially to avoid browser memory issues with large batch uploads
- **Duplicate files**: Accept and process files with identical names by assigning unique identifiers

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
  - Card: Main container for upload area, file list, and results display
  - Button: Primary for "Download CSV" and "Download All", secondary for "New Conversion", tertiary for individual file actions (download/remove)
  - Table: Display coordinate samples and statistics with proper alignment
  - Badge: Show detected coordinate system type and file format
  - Progress: Visual indicator for large file processing
  - Alert: Display warnings for validation issues or errors
  - Separator: Divide sections (upload, file list, analysis, results)
  - Tabs: Switch between "File Info", "Original Data", "Converted Data" views
  
- **Customizations**: 
  - Custom drag-and-drop upload zone with file type icons supporting multiple file drops
  - Coordinate display component with monospace font for precise alignment
  - Custom statistics cards showing row counts, coordinate bounds, etc.
  - File list component with selectable items, individual download/remove actions
  
- **States**: 
  - Upload Button: Hover shows file type hints, active state during file selection, supports multiple file selection
  - Download Button: Individual file download, batch download all, success state with checkmark
  - Drop Zone: Neutral → Drag-over highlight → Processing → Success/Error
  - Table Rows: Hover highlight for data inspection
  - File List Items: Default → Selected (highlighted) → Hover states
  
- **Icon Selection**: 
  - UploadSimple: Main upload action
  - FileCsv, FileXls, File: File type indicators for CSV, Excel, and documents
  - MapPin, Globe: Coordinate system indicators
  - CheckCircle: Successful conversion
  - Warning: Validation issues
  - DownloadSimple: Download action (individual and batch)
  - ArrowsClockwise: New conversion/reset
  - Stack: Multiple files indicator
  - Trash: Remove individual file from batch
  
- **Spacing**: 
  - Card padding: p-6
  - Section gaps: gap-6
  - Element spacing: gap-4
  - Tight groups: gap-2
  - Table cells: px-4 py-2
  - File list items: gap-3
  
- **Mobile**: 
  - Single column layout on mobile (<768px)
  - Reduced table columns showing only essential data
  - Stacked info cards instead of grid
  - Full-width upload zone with touch-friendly size
  - Simplified file list with vertical stacking
  - Individual action buttons stack vertically on mobile
