/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

import {
  AbstractSuggestionsProvider,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '.';
import { SearchResultItem } from '../../../../model';

export class FileSuggestionsProvider extends AbstractSuggestionsProvider {
  public async getSuggestions(query: string): Promise<AutocompleteSuggestionGroup> {
    const res = await kfetch({
      pathname: `../api/code/suggestions/doc`,
      method: 'get',
      query: { q: query },
    });
    const suggestions = Array.from(res.results)
      .slice(0, this.MAX_SUGGESTIONS_PER_GROUP)
      .map((doc: SearchResultItem) => {
        return {
          description: doc.filePath,
          end: 10,
          start: 1,
          text: doc.filePath,
          tokenType: 'tokenFile',
          selectUrl: `/${doc.uri}/blob/HEAD/${doc.filePath}`,
        };
      });
    return {
      type: AutocompleteSuggestionType.FILE,
      total: res.total,
      suggestions,
    };
  }
}
