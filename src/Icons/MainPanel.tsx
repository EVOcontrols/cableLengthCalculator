import React from 'react';

type IconType = {
  width?: string;
  height?: string;
  fill?: string;
};

export const MainPanelIcon: React.FC<IconType> = ({
  height = '25',
  width = '25',
  fill = '#000',
}) => (
  <svg
    version='1.0'
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    preserveAspectRatio='xMidYMid meet'
  >
    <g
      transform='translate(-11.000000,25.000000) scale(0.00500000,-0.00500000)'
      fill={fill}
      stroke='none'
    >
      <path
        d='M4526 5106 c-21 -8 -54 -29 -73 -48 -28 -26 -296 -556 -1215 -2398
-649 -1301 -1184 -2386 -1190 -2412 -21 -87 24 -171 117 -221 l40 -22 2365 -3
c1689 -2 2380 0 2416 8 58 12 124 62 151 114 10 19 17 55 17 95 l0 63 -1175
2350 c-646 1293 -1186 2368 -1201 2389 -55 76 -170 115 -252 85z m651 -1833
c835 -1680 1413 -2845 1413 -2849 0 -2 -898 -4 -1996 -4 -1591 0 -1995 3
-1992 12 4 16 1992 3996 1996 3997 2 1 262 -520 579 -1156z'
      />
      <path
        d='M4547 3245 c-80 -20 -135 -75 -157 -154 -14 -51 -13 -1183 1 -1236
17 -63 56 -112 112 -140 91 -45 189 -26 254 48 63 72 64 79 61 738 -3 586 -3
595 -25 634 -51 95 -144 137 -246 110z'
      />
      <path
        d='M4515 1331 c-86 -39 -144 -138 -131 -223 19 -116 102 -188 216 -188
61 0 105 17 144 56 86 88 94 206 18 295 -64 75 -162 99 -247 60z'
      />
    </g>
  </svg>
);
