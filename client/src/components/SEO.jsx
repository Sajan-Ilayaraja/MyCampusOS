import { useEffect } from 'react';

/**
 * Reusable SEO component to dynamically update page titles and meta descriptions
 * @param {Object} props
 * @param {string} props.title - Page title segment
 * @param {string} props.description - Page meta description content
 */
const SEO = ({ title, description }) => {
  useEffect(() => {
    // 1. Dynamic Page Titles (Item 11)
    document.title = title ? `${title} | MyCampusOS` : 'MyCampusOS - Complete Campus Companion';
    
    // 2. Meta Descriptions
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || 'Track your college coursework, task backlogs, attendance targets, and study metrics in one unified dashboard.';

    // 3. Open Graph Metadata
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title ? `${title} | MyCampusOS` : 'MyCampusOS - Campus Companion';

  }, [title, description]);

  return null;
};

export default SEO;
