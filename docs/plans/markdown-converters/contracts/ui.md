# UI contract

Route /tools/markdown-converters, registered name Markdown converters. Grouped selector exposes all 26 requested workflows. Inputs: pasted source and optional local file. Actions: Convert, Copy result, Download result. Conversion is explicit. Disabled actions reflect busy/empty state; errors and success use role=status. Preview is sanitized and outputs remain selectable on clipboard failure. Existing routes are retained.
