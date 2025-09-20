/**
 * Formats AI responses for better readability in the chat interface
 * Filters out technical details to keep responses conversational
 */
export function formatAIResponse(text: string): string {
  if (!text) return text;

  // Filter out technical patterns that shouldn't appear in chat
  const technicalPatterns = [
    /\*\*Destination:\*\*.*$/gm,
    /\*\*Check-in date:\*\*.*$/gm,
    /\*\*Check-out date:\*\*.*$/gm,
    /\*\*Number of guests:\*\*.*$/gm,
    /\*\*Budget:\*\*.*$/gm,
    /\d+\.\s+\*\*Destination:\*\*.*$/gm,
    /\d+\.\s+\*\*Check-in date:\*\*.*$/gm,
    /\d+\.\s+\*\*Check-out date:\*\*.*$/gm,
    /\d+\.\s+\*\*Number of guests:\*\*.*$/gm,
    /\d+\.\s+\*\*Budget:\*\*.*$/gm,
    /Based on your requirements.*$/gm,
    /Extracted criteria:.*$/gm,
    /Search parameters:.*$/gm,
  ];

  let filteredText = text;
  for (const pattern of technicalPatterns) {
    filteredText = filteredText.replace(pattern, '');
  }

  // Clean up extra whitespace and empty lines
  filteredText = filteredText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  // Split into paragraphs first (double newlines)
  const paragraphs = filteredText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  const formattedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n').map(line => line.trim());

    // Check if this paragraph is a list
    const isNumberedList = lines.some(line => /^\d+\.\s/.test(line));
    const isBulletList = lines.some(line => /^[•\-\*]\s/.test(line));

    if (isNumberedList || isBulletList) {
      // Handle as a list
      const listItems: string[] = [];
      for (const line of lines) {
        if (/^\d+\.\s/.test(line) || /^[•\-\*]\s/.test(line)) {
          listItems.push(line);
        } else if (line && listItems.length > 0) {
          // Continuation of previous list item
          listItems[listItems.length - 1] += ' ' + line;
        }
      }

      if (isNumberedList) {
        formattedParagraphs.push(listItems.map((item, index) => `${index + 1}. ${item.replace(/^\d+\.\s*/, '')}`).join('\n'));
      } else {
        formattedParagraphs.push(listItems.map(item => `• ${item.replace(/^[•\-\*]\s*/, '')}`).join('\n'));
      }
    } else {
      // Handle as regular paragraph
      const fullText = lines.join(' ');

      // Split very long paragraphs (over 300 characters) at sentence boundaries
      if (fullText.length > 300 && fullText.includes('. ')) {
        const sentences = fullText.split(/\.\s+/);
        let currentParagraph = '';

        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i] + (i < sentences.length - 1 ? '.' : '');

          if (currentParagraph.length + sentence.length > 300 && currentParagraph.length > 0) {
            formattedParagraphs.push(currentParagraph.trim());
            currentParagraph = sentence + ' ';
          } else {
            currentParagraph += sentence + ' ';
          }
        }

        if (currentParagraph.trim()) {
          formattedParagraphs.push(currentParagraph.trim());
        }
      } else {
        formattedParagraphs.push(fullText);
      }
    }
  }

  return formattedParagraphs.join('\n\n');
}

/**
 * Converts formatted text to HTML for better display
 */
export function formatResponseToHTML(text: string): string {
  const formatted = formatAIResponse(text);

  return formatted
    .split('\n')
    .map(line => {
      if (line === '') return '<br>';

      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return `<div class="numbered-item">${line}</div>`;
      }

      // Bullet points
      if (/^•\s/.test(line)) {
        return `<div class="bullet-item">${line}</div>`;
      }

      // Regular paragraphs
      return `<p class="response-paragraph">${line}</p>`;
    })
    .join('');
}