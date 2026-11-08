# Highlighted Vocabulary Extractor

[Tiếng Việt](README.md) · **English**

A web tool that extracts highlighted words from photos of text, built for language learners who collect vocabulary from books, documents or screenshots.
All processing runs in the browser with [Tesseract.js](https://github.com/naptha/tesseract.js); images are never uploaded to a server.

## Features

- OCR on the uploaded image with automatic filtering of highlighted words (yellow to green range).
- Word positions marked on the image; hovering a list entry shows the matching word.
- Manual additions by double-clicking a word on the image or typing it in.
- Secondary list of recognized but unhighlighted words, which can be promoted to the main list.
- Edit, remove and copy the full list (one word per line).
- Zoom controls and a debug mode that shows the detected color regions.

## Usage

Open `index.html` in a browser (an Internet connection is needed the first time to load Tesseract.js and the language model), or deploy the folder to any static host such as GitHub Pages.

1. Choose an image containing highlighted text.
2. Click **Quét văn bản** (Scan).
3. Review and edit the list, then click **Copy danh sách** (Copy list).

## Configuration

The OCR language is set by the `OCR_LANG` constant in `script.js` (default `eng`). Use `vie` for Vietnamese or `eng+vie` for both.

Highlight color thresholds are defined in `isHighlightPixel` (HSL color space).

## Structure

```
index.html   Markup
style.css    Styles
script.js    OCR, highlight detection, word list management
```

## Author

Vũ Đình Đạt · [@Vudinhdat02](https://github.com/Vudinhdat02)
