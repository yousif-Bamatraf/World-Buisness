import type { Schema, Struct } from '@strapi/strapi';

export interface SharedSectors extends Struct.ComponentSchema {
  collectionName: 'components_shared_sectors';
  info: {
    displayName: 'Sectors';
  };
  attributes: {
    Sector: Schema.Attribute.Enumeration<
      [
        'Education',
        'Digital Transformation ',
        'Energy',
        'Banking and Financial Services ',
        'Commercial ',
        'Industrial ',
        'Investment ',
        'Contracting and Public Services ',
      ]
    > &
      Schema.Attribute.Required;
  };
}

export interface SharedTagsList extends Struct.ComponentSchema {
  collectionName: 'components_shared_tags_lists';
  info: {
    displayName: 'tags-list';
  };
  attributes: {
    New_Tag: Schema.Attribute.Enumeration<
      [
        'Project Management',
        'Investment',
        'Feasibility Studies',
        'Institutional Development',
        'Entrepreneurship',
        'Startups',
        'Education and Training',
        'Digital Transformation',
        'Studies and Consulting',
      ]
    > &
      Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.sectors': SharedSectors;
      'shared.tags-list': SharedTagsList;
    }
  }
}
