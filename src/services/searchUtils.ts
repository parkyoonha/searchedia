/**
 * Utility functions for enhancing stock photo search queries
 */

/**
 * Enhances search query for better results across stock photo sites
 * Specifically handles the "isolated" keyword which stock sites recognize
 * but community platforms like Unsplash might not tag consistently
 */
export function enhanceSearchQuery(query: string): string {
  // Don't modify if it's already in "isolated background" format
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('isolated background')) {
    console.log('[SearchUtils] Preserving "isolated background" format:', query);
    return query;
  }

  // Handle standalone "isolated" keyword - replace with terms that work better
  if (lowerQuery.includes('isolated')) {
    const enhanced = query.replace(/isolated/gi, 'white background').trim();
    console.log('[SearchUtils] Enhanced "isolated" query:', { original: query, enhanced });
    return enhanced;
  }

  return query;
}

