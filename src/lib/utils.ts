/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getYoutubeEmbedUrl(url: string): string {
  if (!url) return "";
  
  // Already embed format
  if (url.includes('youtube.com/embed/')) return url;
  
  // Handle YouTube Shorts
  if (url.includes('youtube.com/shorts/')) {
    const parts = url.split('shorts/');
    if (parts.length > 1) {
      const id = parts[1].split(/[?#]/)[0];
      return `https://www.youtube.com/embed/${id}`;
    }
  }

  // Handle standard YouTube links and youtu.be
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  
  return url;
}

export function getYoutubeId(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('youtube.com/shorts/')) {
    const parts = url.split('shorts/');
    if (parts.length > 1) {
      return parts[1].split(/[?#]/)[0];
    }
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }
  
  return null;
}

export function getProcessedImageUrl(url: string): string {
  if (!url) return "";
  
  // Handle Instagram Posts
  if (url.includes('instagram.com/p/') || url.includes('instagram.com/reels/')) {
    const baseUrl = url.split(/[?#]/)[0];
    return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}media/?size=l`;
  }
  
  return url;
}
