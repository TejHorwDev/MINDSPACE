export type SlideLayoutType = "title" | "title-content" | "two-column" | "image-text";

export interface SlideRegionContent {
  [regionKey: string]: any;
}

export interface SlideItem {
  id: string;
  presentationId: string;
  order: number;
  layoutType: SlideLayoutType;
  contentJson: SlideRegionContent;
  speakerNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PresentationItem {
  id: string;
  ownerId: string;
  title: string;
  slides: SlideItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LayoutTemplateOption {
  type: SlideLayoutType;
  name: string;
  description: string;
  iconName: string;
}

export const STARTER_LAYOUTS: LayoutTemplateOption[] = [
  {
    type: "title",
    name: "Title Slide",
    description: "Big presentation title and presenter subtitle",
    iconName: "Heading1",
  },
  {
    type: "title-content",
    name: "Title + Content",
    description: "Slide heading with focused single-column body text",
    iconName: "LayoutTemplate",
  },
  {
    type: "two-column",
    name: "Two-Column",
    description: "Header with side-by-side comparison or split text columns",
    iconName: "Columns2",
  },
  {
    type: "image-text",
    name: "Image + Text",
    description: "Header with visual media frame alongside rich explanatory text",
    iconName: "Image",
  },
];
