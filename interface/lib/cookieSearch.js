/**
 * Enhanced search functionality with fuzzy matching for cookies.
 */
export class CookieSearch {
  /**
   * Performs fuzzy search on cookie name.
   * @param {string} searchTerm The term to search for.
   * @param {string} cookieName The cookie name to match against.
   * @return {number} Score between 0-1, where higher means better match.
   */
  static fuzzyMatch(searchTerm, cookieName) {
    searchTerm = searchTerm.toLowerCase();
    cookieName = cookieName.toLowerCase();

    // Exact match gets highest score
    if (cookieName === searchTerm) {
      return 1;
    }

    // Contains match gets high score
    if (cookieName.includes(searchTerm)) {
      return 0.8;
    }

    // Fuzzy match - check if all characters appear in order
    let score = 0;
    let termIndex = 0;

    for (
      let i = 0;
      i < cookieName.length && termIndex < searchTerm.length;
      i++
    ) {
      if (cookieName[i] === searchTerm[termIndex]) {
        score += 1;
        termIndex++;
      }
    }

    // If we matched all characters, return proportional score
    if (termIndex === searchTerm.length) {
      return (score / cookieName.length) * 0.6;
    }

    return 0;
  }

  /**
   * Search cookies with multiple criteria.
   * @param {Array} cookies Array of cookie objects to search.
   * @param {string} searchTerm The search term.
   * @param {object} options Search options.
   * @return {Array} Filtered and sorted cookies.
   */
  static search(cookies, searchTerm, options = {}) {
    const {
      searchInValue = false,
      searchInDomain = false,
      minScore = 0.3,
    } = options;

    if (!searchTerm) {
      return cookies;
    }

    const results = [];

    for (const cookie of cookies) {
      let maxScore = this.fuzzyMatch(searchTerm, cookie.name);

      if (searchInValue && cookie.value) {
        maxScore = Math.max(
          maxScore,
          this.fuzzyMatch(searchTerm, cookie.value) * 0.7
        );
      }

      if (searchInDomain && cookie.domain) {
        maxScore = Math.max(
          maxScore,
          this.fuzzyMatch(searchTerm, cookie.domain) * 0.5
        );
      }

      if (maxScore >= minScore) {
        results.push({ cookie, score: maxScore });
      }
    }

    return results.sort((a, b) => b.score - a.score).map(r => r.cookie);
  }

  /**
   * Highlight matching parts in text.
   * @param {string} text The text to highlight.
   * @param {string} searchTerm The term to highlight.
   * @return {string} HTML with highlighted matches.
   */
  static highlight(text, searchTerm) {
    if (!searchTerm) {
      return text;
    }

    const safeText = text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Escapes special regex characters.
   * @param {string} string The string to escape.
   * @return {string} Escaped string.
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
