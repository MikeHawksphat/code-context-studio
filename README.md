# Code Context Studio

## Description

Code Context Studio is a lightweight, browser-based utility designed to convert complex directory structures and code files into a single, formatted text output optimized for Large Language Models (LLMs) like ChatGPT, Claude, and DeepSeek.

It features a modern, integrated development environment (IDE) aesthetic, providing a familiar interface for developers to selectively include or exclude files before generating context.

## Features

*   **Drag and Drop Support:** Import entire project directories directly via drag and drop or a standard file browser.
*   **Interactive File Explorer:** A sidebar provides a visual tree view of your project. You can expand folders, toggle specific files, or select entire directories.
*   **Smart Filtering:** The application automatically ignores heavy system directories (such as node_modules, .git, dist) and binary files to ensure performance and cleaner output.
*   **Privacy Focused:** All processing is performed locally within your web browser. No file data is ever uploaded to an external server.
*   **ASCII Structure Generation:** Option to generate a visual text-based map of the directory structure at the top of the output.
*   **Customizable Output:** Settings to include or exclude empty folders and toggle the structure visualization.

## Installation and Usage

### Running the Application
Code Context Studio is a standalone application contained entirely within a single HTML file. It requires no installation, dependencies, or build steps.

1.  Download the index.html file.
2.  Open the file in any modern web browser (Chrome, Edge, Firefox, Safari).

### How to Use
1.  **Import Project:** Drag your project folder onto the main drop zone or click the "Browse" button to select a directory.
2.  **Select Files:** Use the file explorer sidebar on the left to review your project. Uncheck any files or folders you do not wish to share with the AI.
    *   Clicking a file name toggles its selection.
    *   Clicking the arrow icon or double-clicking a row expands or collapses folders.
3.  **Configure:** Use the checkboxes in the top toolbar to toggle the "Tree" visualization or "Empty Folders" inclusion.
4.  **Generate:** Click the "Generate" button. The application will compile the selected files into a single text block in the right-hand pane.
5.  **Copy:** Click the "Copy" button to copy the entire output to your clipboard, ready for pasting into an AI chat interface.

## Configuration

To modify the default settings, such as which folders or file extensions are ignored automatically:

1.  Open the index.html file in any text editor (Notepad, TextEdit, VS Code).
2.  Scroll to the bottom of the file to the script section.
3.  Locate the configuration arrays labeled IGNORE_FOLDERS and IGNORE_EXTS.
4.  Add or remove items from these lists as needed and save the file.

## Privacy

This tool operates entirely on the client side using standard web APIs. Your code is processed in your browser's memory and is never transmitted over the internet.

## License

Distributed under the MIT License.
