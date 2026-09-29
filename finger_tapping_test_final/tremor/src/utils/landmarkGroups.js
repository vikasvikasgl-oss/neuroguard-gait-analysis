// Landmark indices based on MediaPipe FaceMesh model topology
export const LANDMARK_GROUPS = {
  // Rigid reference anchors (insensitive to facial expressions/tremors)
  NOSE_BRIDGE: [168, 6, 197, 195, 5],
  NOSE_TIP: [1, 2, 98, 327],
  EYE_CORNERS_OUTER: [33, 263],

  // Clinical target regions
  LIPS_OUTER: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409],
  LIPS_INNER: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80, 81, 82, 13, 312, 311, 310, 415],
  CHIN: [152, 148, 175, 199, 200, 176, 149, 150],
  EYELIDS_LEFT: [33, 160, 158, 133, 153, 144, 145, 163],
  EYELIDS_RIGHT: [263, 387, 385, 362, 380, 373, 374, 390],
  EYEBROWS_LEFT: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  EYEBROWS_RIGHT: [300, 293, 335, 296, 336, 285, 295, 282, 283, 276],
  JAW_LINE: [172, 397, 136, 365, 58, 288, 147, 376],
};

export const CLINICAL_REGIONS = [
  {
    id: 'perioral',
    name: 'Lips & Perioral',
    description: 'Rabbit syndrome / Perioral resting tremor',
    indices: [61, 291, 0, 17, 13, 14, 37, 267, 84, 314, 78, 308, 146, 375],
    color: '#3B82F6', // Clean Medical Blue
  },
  {
    id: 'chin',
    name: 'Chin & Mentalis',
    description: 'Mentalis muscle rhythmic oscillations',
    indices: [152, 148, 175, 199, 200, 176, 149],
    color: '#60A5FA', // Light Blue
  },
  {
    id: 'eyelids',
    name: 'Eyelids & Ocular',
    description: 'Periorbital fasciculation / Myokymia',
    indices: [159, 145, 160, 144, 386, 374, 385, 373],
    color: '#93C5FD', // Soft Sky Blue
  },
  {
    id: 'eyebrows',
    name: 'Eyebrows & Forehead',
    description: 'Frontalis micro-movements',
    indices: [70, 63, 105, 66, 300, 293, 335, 296],
    color: '#CBD5E1', // Subtle Slate
  },
  {
    id: 'jaw',
    name: 'Jaw & Mandible',
    description: 'Mandibular rest/postural tremor',
    indices: [172, 397, 136, 365, 58, 288],
    color: '#94A3B8', // Muted Slate
  },
];

export const REGION_MAPPINGS = {
  perioral: CLINICAL_REGIONS[0].indices,
  chin: CLINICAL_REGIONS[1].indices,
  eyelids: CLINICAL_REGIONS[2].indices,
  eyebrows: CLINICAL_REGIONS[3].indices,
  jaw: CLINICAL_REGIONS[4].indices,
};