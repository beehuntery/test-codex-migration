import { useState } from 'react';

export function useTaskTags(initialTags: string[]) {
  const [tags, setTags] = useState(initialTags);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      return;
    }
    setTags((prev) => [...prev, trimmed]);
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const reset = (nextTags: string[]) => {
    setTags(nextTags);
  };

  return {
    tags,
    addTag,
    removeTag,
    reset
  };
}
