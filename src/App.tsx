import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import * as htmlToImage from 'html-to-image';
import 'svg2pdf.js';
import './App.css';
import ParametrModal from './ParametrModal/ParametrModal';
import ScaleModal from './ScaleModal/ScaleModal';
import { SvgIcon } from './SvgIcon/SvgIcon';
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [vertices, setVertices] = useState<{
    [key: string]: [number, number][];
  }>({});
  const [lines, setLines] = useState<[string, string][]>([]);
  const [iconParameters, setIconParameters] = useState<{ [key: string]: any }>(
    {}
  );
  const [draggedVertex, setDraggedVertex] = useState<number[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentElementType, setCurrentElementType] = useState<{
    type: string;
    id: string;
  }>({ type: '', id: '' });
  const [currentIconId, setCurrentIconId] = useState<string>('');
  const [showParams, setShowParams] = useState(false);
  const [scaleLine, setScaleLine] = useState<{
    points: [number, number][];
    scale: number | null;
  }>({ points: [], scale: null });
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [scaleLinePoints, setScaleLinePoints] = useState<[number, number][]>(
    []
  );
  const [creatingScaleLine, setCreatingScaleLine] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedIconsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browserFrameRef = useRef<HTMLDivElement>(null);
  const draggedIconRef = useRef<HTMLDivElement | null>(null);
  const mouseOffsetRef = useRef<[number, number] | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', e.currentTarget.outerHTML);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // const linesRef = useRef(lines);
  // useEffect(() => {
  //   linesRef.current = lines;
  // }, [lines]);

  const handleIconClick = useCallback(
    (iconId: string, elementType?: string) => {
      const iconElement = document.getElementById(iconId);
      if (!iconElement) return;

      const newSelected = [...selectedIconsRef.current, iconId];

      if (newSelected.length === 2) {
        setLines((prevLines) => [
          ...prevLines,
          [newSelected[0], newSelected[1]],
        ]);
        selectedIconsRef.current = []; // Reset the selected icons
      } else {
        selectedIconsRef.current = newSelected;
      }

      setCurrentElementType((prevState) => {
        return {
          ...prevState,
          id: iconId,
          type: elementType ? elementType : prevState.type,
        };
      });
    },
    []
  );

  const handleDeleteIcon = useCallback((iconId: string) => {
    // Remove the icon from the DOM
    const iconElement = document.getElementById(iconId);
    if (iconElement) {
      iconElement.remove();
    }

    setSelectedIcons((prevSelected) => {
      return prevSelected.filter((id) => id !== iconId);
    });

    // Remove any lines connected to the icon
    setLines((prevLines) => {
      return prevLines.filter(
        (line) => line[0] !== iconId && line[1] !== iconId
      );
    });
  }, []);

  const updateLinesAndVertices = useCallback(
    (iconId: string) => {
      setLines((prevLines) => {
        const newLines = [...prevLines];

        newLines.forEach((line, index) => {
          if (line[0] === iconId || line[1] === iconId) {
            // If the line has vertices, only update the line if it has no vertices
            if (!vertices[index] || vertices[index].length === 0) {
              if (line[0] === iconId) {
                newLines[index][0] = iconId;
                newLines[index][1] = line[1];
              } else if (line[1] === iconId) {
                newLines[index][0] = line[0];
                newLines[index][1] = iconId;
              }
            }
          }
        });

        return newLines;
      });

      // Update the vertices positions
      setVertices((prevVertices) => {
        const newVertices = { ...prevVertices };
        Object.keys(newVertices).forEach((key) => {
          const lineIndex = parseInt(key);
          newVertices[lineIndex] = newVertices[lineIndex].map((vertex) => {
            const [x, y] = vertex;
            // Update x and y positions for vertices of this line
            return [x, y];
          });
        });
        return newVertices;
      });
    },
    [vertices]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const iconHTML = e.dataTransfer.getData('text/plain');
      const elementType = e.dataTransfer.getData('elementType');
      const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
      const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));

      const wrapper = document.createElement('div');
      wrapper.classList.add('icon-wrapper');
      wrapper.innerHTML = iconHTML;

      // Generate a unique ID for the wrapper
      const iconId = `${elementType}-${Date.now()}`;
      wrapper.id = iconId;

      const browserFrameRect = browserFrameRef.current?.getBoundingClientRect();
      if (!browserFrameRect) return;

      wrapper.style.position = 'absolute';
      wrapper.style.left = `${
        (e.clientX - browserFrameRect.left - offsetX) / zoomLevel
      }px`;
      wrapper.style.top = `${
        (e.clientY - browserFrameRect.top - offsetY) / zoomLevel
      }px`;

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      wrapper.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = wrapper.offsetLeft;
        startTop = wrapper.offsetTop;
        handleIconClick(iconId, elementType);
        document.body.classList.add('hide-cursor');
      });

      wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleDeleteIcon(iconId);
      });

      if (browserFrameRef.current) {
        browserFrameRef.current.addEventListener('mousemove', (e) => {
          if (!isDragging) return;

          e.stopPropagation();
          const diffX = (e.clientX - startX) / zoomLevel;
          const diffY = (e.clientY - startY) / zoomLevel;

          wrapper.style.left = `${startLeft + diffX}px`;
          wrapper.style.top = `${startTop + diffY}px`;

          // Update the lines
          setLines((prevLines) => {
            const newLines = [...prevLines];
            // Iterate over the lines and update the endpoints for this icon
            newLines.forEach((line, index) => {
              if (line[0] === iconId) {
                newLines[index][0] = iconId;
                newLines[index][1] = line[1];
              }
              if (line[1] === iconId) {
                newLines[index][0] = line[0];
                newLines[index][1] = iconId;
              }
            });
            return newLines;
          });
        });

        browserFrameRef.current.addEventListener('mouseup', (e) => {
          if (!isDragging) return;

          e.stopPropagation();
          isDragging = false;

          document.body.classList.remove('hide-cursor');
        });
      }

      e.currentTarget.appendChild(wrapper);
      setCurrentElementType({ type: elementType, id: iconId });
      setCurrentIconId(iconId);
      setIsModalOpen(true);
    },
    [handleIconClick, handleDeleteIcon, zoomLevel]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseOffsetRef.current) return;

      const [dx, dy] = mouseOffsetRef.current;
      const x = e.clientX - dx;
      const y = e.clientY - dy;

      if (draggedVertex) {
        const [lineIndex, vertexIndex] = draggedVertex;
        setVertices((prevVertices) => {
          const newVertices = { ...prevVertices };
          newVertices[lineIndex][vertexIndex] = [x, y];
          return newVertices;
        });

        // Update the polyline element
        const polyline = document.getElementById(`line-${lineIndex}`);
        if (polyline) {
          const line = lines[lineIndex];
          const startIcon = document.getElementById(line[0]);
          const endIcon = document.getElementById(line[1]);

          if (startIcon && endIcon) {
            const points = [
              [
                startIcon.offsetLeft + startIcon.offsetWidth / 2,
                startIcon.offsetTop + startIcon.offsetHeight / 2,
              ],
              ...vertices[lineIndex],
              [
                endIcon.offsetLeft + endIcon.offsetWidth / 2,
                endIcon.offsetTop + endIcon.offsetHeight / 2,
              ],
            ]
              .map(([x, y]) => `${x},${y}`)
              .join(' ');

            polyline.setAttribute('points', points);
          }
        }
      }
      document.body.classList.add('hide-cursor');

      if (draggedIconRef.current) {
        draggedIconRef.current.style.left = `${x}px`;
        draggedIconRef.current.style.top = `${y}px`;

        const iconId = draggedIconRef.current.id;

        updateLinesAndVertices(iconId);
      }
    };

    const handleMouseUp = () => {
      draggedIconRef.current = null;
      mouseOffsetRef.current = null;
      setDraggedVertex(null);
      document.body.classList.remove('hide-cursor');
    };

    // Attach event listeners to the document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Detach event listeners when the component is unmounted
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedVertex, updateLinesAndVertices, zoomLevel, lines, vertices]);

  const onModalClose = (parameters: any) => {
    const data = {
      elementType: parameters.elementType,
      Group: parameters.group || '',
      Name: parameters.name || '',
      Voltage: parameters.voltage || '',
      Type: parameters.type || '',
      Power: parameters.power || '',
      Interface: parameters.interface || '',
      Cable: parameters.cable || '',
    };

    if (data.elementType !== 'mainPanel') {
      try {
        fetch(
          'https://script.google.com/macros/s/AKfycbya__p6uVN6b1GTb96STwgFqGya5TE95TIVhnhZop9LPSw0SaXxvaWLNJ0S5fomasnn_A/exec',
          {
            redirect: 'follow',
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
          }
        );
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log('its mainPanel');
    }

    setIconParameters((prevParameters) => {
      return { ...prevParameters, [currentIconId]: parameters };
    });

    setIsModalOpen(false);
  };

  const handleDoubleClick = useCallback(
    (
      e: React.MouseEvent<SVGPolylineElement, MouseEvent>,
      lineIndex: number
    ) => {
      e.stopPropagation();
      const svgRect = (
        browserFrameRef.current as HTMLDivElement
      ).getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      setVertices((prevVertices) => {
        const newVertices = { ...prevVertices };
        if (!newVertices[lineIndex]) {
          newVertices[lineIndex] = [];
        }
        newVertices[lineIndex].push([x, y]);
        return newVertices;
      });
    },
    []
  );

  const handleFileUpload = () => {
    if (fileInputRef.current && fileInputRef.current.files) {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        setPdfUrl(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const renderPdfAsBackground = async (url: string) => {
    const pdf = await getDocument(url).promise;
    const page = await pdf.getPage(1);
    const desiredDPI = 300; // Desired resolution in DPI
    const scale = desiredDPI / 96; // Convert the desired resolution to a scale factor
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    const renderContext = {
      canvasContext: context!,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    const wallpaper = canvas.toDataURL('image/png');
    browserFrameRef.current!.style.backgroundImage = `url(${wallpaper})`;
    browserFrameRef.current!.style.backgroundSize = 'contain';
    browserFrameRef.current!.style.backgroundRepeat = 'no-repeat';
  };

  useEffect(() => {
    if (pdfUrl) {
      renderPdfAsBackground(pdfUrl);
    }
  }, [pdfUrl]);

  const handleDeleteVertex = useCallback(
    (lineIndex: number, vertexIndex: number) => {
      setVertices((prevVertices) => {
        const newVertices = { ...prevVertices };
        newVertices[lineIndex].splice(vertexIndex, 1);
        return newVertices;
      });
    },
    []
  );

  const handleRemoveLine = (lineIndex: number) => {
    setLines((prevLines) =>
      prevLines.filter((_, index) => index !== lineIndex)
    );
    setVertices((prevVertices) => {
      const updatedVertices = { ...prevVertices };
      delete updatedVertices[lineIndex];
      return updatedVertices;
    });
  };

  const toggleParams = () => {
    setShowParams((prevShow) => !prevShow);
  };

  const renderParameters = (iconId: string) => {
    if (!showParams) return null;

    const parameters = iconParameters[iconId];
    if (!parameters) return null;

    return (
      <div
        className='icon-parameters'
        style={{
          position: 'absolute',
          left: '-90px',
          backgroundColor: 'white',
          border: '1px solid black',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
        }}
      >
        {Object.entries(parameters).map(([key, value]) => (
          <div key={`${iconId}-${key}`}>
            {key}: {value as React.ReactNode}
          </div>
        ))}
      </div>
    );
  };

  const calculateLineLengths = () => {
    const lines = document.querySelectorAll('.lines-container polyline');
    const groupLengths: { [key: string]: number } = {};
    let groupStartLengths: { [key: string]: number } = {}; // опуск кабеля

    lines.forEach((line) => {
      const group = line.getAttribute('data-group');
      const points = line.getAttribute('points');

      if (points && group) {
        let startingLenghtCable = 0;
        Object.entries(iconParameters).forEach(([key, value]) => {
          if (value.cable && value.group === group) {
            startingLenghtCable += Number(value.cable);
          }
        });

        groupStartLengths[group] = 0;

        groupStartLengths[group] += startingLenghtCable;

        const pointList = points
          .trim()
          .split(' ')
          .map((point) => point.split(',').map((coord) => parseFloat(coord)))
          .filter((point) => point.length === 2);
        for (let i = 0; i < pointList.length - 1; i++) {
          const [x1, y1] = pointList[i];
          const [x2, y2] = pointList[i + 1];

          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

            if (!groupLengths[group]) {
              groupLengths[group] = 0;
            }

            groupLengths[group] += length;
          }
        }
      }
    });

    let alertString = '';

    Object.entries(groupLengths).forEach(([key, value]) => {
      alertString =
        alertString +
        `Группа ${key}: ${
          scaleLine.scale
            ? `${(
                value / scaleLine.scale +
                Number(groupStartLengths[key])
              ).toFixed(2)} m`
            : `${value.toFixed(2)} px`
        }
      ${
        groupStartLengths[key]
          ? `из них опуски: ${groupStartLengths[key].valueOf()} m\n\n`
          : ''
      }`;

      if (scaleLine.scale) {
        const data = {
          elementType: 'cableLength',
          Group: key,
          Length: (
            value / scaleLine.scale +
            Number(groupStartLengths[key])
          ).toFixed(2),
        };

        fetch(
          'https://script.google.com/macros/s/AKfycbya__p6uVN6b1GTb96STwgFqGya5TE95TIVhnhZop9LPSw0SaXxvaWLNJ0S5fomasnn_A/exec',
          {
            redirect: 'follow',
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
          }
        );
      }
    });

    alert(alertString);
  };

  const downloadImage = async () => {
    const browserFrame = document.getElementById('browser-frame');

    if (!browserFrame) {
      alert('Error: Unable to find the browser frame element.');
      return;
    }

    try {
      const imageDataUrl = await htmlToImage.toPng(browserFrame);
      const link = document.createElement('a');
      link.href = imageDataUrl;
      link.download = 'schema.png';
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error: Unable to generate the image.');
    }
  };

  const handleLineContextMenu = (e: React.MouseEvent, lineIndex: number) => {
    e.preventDefault();
    handleRemoveLine(lineIndex);
    e.stopPropagation();
  };

  const handleScaleLineClick = (e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    const svgRect = (
      browserFrameRef.current as HTMLDivElement
    ).getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    const [adjustedX, adjustedY] = getAdjustedCoordinates(
      x,
      y,
      0,
      0,
      zoomLevel
    );

    if (scaleLine.points.length === 0) {
      setScaleLine({ ...scaleLine, points: [[adjustedX, adjustedY]] });
    } else if (scaleLine.points.length === 1) {
      setScaleLinePoints([]);
    } else {
      setScaleLine({
        ...scaleLine,
        points: [...scaleLine.points, [adjustedX, adjustedY]],
      });
      setIsScaleModalOpen(true);
      setIsScaleMode(false);
    }
  };

  useEffect(() => {
    if (scaleLinePoints.length === 3) {
      setIsScaleMode(false);
    }
  }, [scaleLinePoints]);

  const handleScaleModalClose = (distanceInM: number) => {
    const [p1, p2] = scaleLinePoints;
    const lineLengthPx = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
    setScaleLine({ ...scaleLine, scale: lineLengthPx / distanceInM });
    setIsScaleModalOpen(false);
  };

  const handleScaleLineCreation = (e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    const svgRect = (
      browserFrameRef.current as HTMLDivElement
    ).getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    const [adjustedX, adjustedY] = getAdjustedCoordinates(
      x,
      y,
      0,
      0,
      zoomLevel
    );

    if (!creatingScaleLine) {
      setCreatingScaleLine(true);
      setScaleLinePoints([[adjustedX, adjustedY]]);
    } else {
      setCreatingScaleLine(false);
      setScaleLinePoints([...scaleLinePoints, [adjustedX, adjustedY]]);
      setIsScaleModalOpen(true);
    }
  };

  const getAdjustedCoordinates = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zoomLevel: number
  ) => {
    const adjustedX1 = x1 / zoomLevel;
    const adjustedY1 = y1 / zoomLevel;
    const adjustedX2 = x2 / zoomLevel;
    const adjustedY2 = y2 / zoomLevel;

    return [adjustedX1, adjustedY1, adjustedX2, adjustedY2];
  };

  const handleZoomIn = () => {
    setZoomLevel((prevZoom) => Math.min(prevZoom + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoom) => Math.max(prevZoom - 0.1, 0.5));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!creatingScaleLine) return;

      const svgRect = (
        browserFrameRef.current as HTMLDivElement
      ).getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      const [adjustedX, adjustedY] = getAdjustedCoordinates(
        x,
        y,
        0,
        0,
        zoomLevel
      );

      setScaleLinePoints((prevPoints) => {
        const newPoints = [...prevPoints];
        newPoints[1] = [adjustedX, adjustedY];
        return newPoints;
      });
    };

    if (browserFrameRef.current) {
      browserFrameRef.current.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (browserFrameRef.current) {
        browserFrameRef.current.removeEventListener(
          'mousemove',
          handleMouseMove
        );
      }
    };
  }, [creatingScaleLine, zoomLevel]);

  const updateLines = (lines: [string, string][], zoomLevel: number) => {
    lines.forEach(([from, to], lineIndex) => {
      if (!browserFrameRef.current) return;
      const fromElement = document.getElementById(from);
      const toElement = document.getElementById(to);

      if (!fromElement || !toElement) return;

      const svgRect = browserFrameRef.current.getBoundingClientRect();
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      const x1 = fromRect.left + fromRect.width / 2 - svgRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
      const x2 = toRect.left + toRect.width / 2 - svgRect.left;
      const y2 = toRect.top + toRect.height / 2 - svgRect.top;

      const [adjustedX1, adjustedY1, adjustedX2, adjustedY2] =
        getAdjustedCoordinates(x1, y1, x2, y2, zoomLevel);

      // Update the positions of the polyline points
      const lineElement = document.querySelector(
        `.line polyline[data-line-index="${lineIndex}"]`
      );
      if (lineElement) {
        lineElement.setAttribute(
          'points',
          `${adjustedX1},${adjustedY1} ${adjustedX2},${adjustedY2}`
        );
      }
    });
  };

  useEffect(() => {
    updateLines(lines, zoomLevel);
  }, [lines, zoomLevel]);

  useEffect(() => {
    if (zoomLevel === 1) return; // No need to update lines and vertices when the zoom level is 1

    lines.forEach((line, index) => {
      const lineVertices = vertices[index] || [];

      // Update the line based on the zoom level
      const icon1 = document.getElementById(line[0]);
      const icon2 = document.getElementById(line[1]);

      if (icon1 && icon2) {
        const icon1Rect = icon1.getBoundingClientRect();
        const icon2Rect = icon2.getBoundingClientRect();

        const polyline = document.getElementById(`line-${index}`);
        if (!polyline) return;

        const points = [
          `${icon1Rect.left + (icon1Rect.width / 2) * zoomLevel},${
            icon1Rect.top + (icon1Rect.height / 2) * zoomLevel
          }`,
          ...lineVertices.map(([x, y]) => `${x * zoomLevel},${y * zoomLevel}`),
          `${icon2Rect.left + (icon2Rect.width / 2) * zoomLevel},${
            icon2Rect.top + (icon2Rect.height / 2) * zoomLevel
          }`,
        ].join(' ');

        polyline.setAttribute('points', points);
      }
    });
  }, [zoomLevel, vertices, lines]);

  return (
    <div className='App'>
      <div className='sidebar'>
        <SvgIcon
          onDragStart={handleDragStart}
          elementType='bulb'
          iconType={'bulb'}
          id={''}
        />
        <SvgIcon
          onDragStart={handleDragStart}
          elementType='sensor'
          iconType={'sensor'}
          id={''}
        />
        <SvgIcon
          onDragStart={handleDragStart}
          elementType='switch'
          iconType={'switch'}
          id={''}
        />
        <SvgIcon
          onDragStart={handleDragStart}
          elementType='mainPanel'
          iconType={'mainPanel'}
          id={''}
        />
        <button onClick={handleZoomIn} className='zoomInButton'>
          Zoom In
        </button>
        <button onClick={handleZoomOut} className='zoomOutButton'>
          Zoom Out
        </button>
        <input
          type='file'
          ref={fileInputRef}
          accept='application/pdf'
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button onClick={toggleParams} className='show-parameters-button'>
          {`${showParams ? 'Hide' : 'Show'} params`}
        </button>
        <button onClick={calculateLineLengths} className='calculate-button'>
          Cable lenght
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className='uploadButton'
        >
          Upload schema
        </button>
        <button
          onClick={() => setIsScaleMode(!isScaleMode)}
          className='scale-button'
        >
          {`${isScaleMode ? 'Cancel' : 'Set'} scale`}
        </button>
        <button onClick={downloadImage} className='downloadButton'>
          Download Schema
        </button>
      </div>
      <div
        className='browser-frame'
        id='browser-frame'
        ref={browserFrameRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {scaleLinePoints.length !== 3 && (
          <svg
            className='scale-line'
            onClick={isScaleMode ? handleScaleLineCreation : undefined}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              cursor: isScaleMode ? 'crosshair' : 'default',
            }}
          >
            {scaleLinePoints.length >= 2 && (
              <polyline
                points={scaleLinePoints
                  .map((point) => point.join(','))
                  .join(' ')}
                style={{
                  fill: 'none',
                  stroke: 'red',
                  strokeWidth: 1,
                }}
              />
            )}
          </svg>
        )}
        <svg
          className='lines-container'
          onClick={(e) => {
            if (isScaleMode) {
              handleScaleLineClick(e);
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
        >
          {lines.map((line, index) => {
            const startIcon = document.getElementById(line[0]);
            const endIcon = document.getElementById(line[1]);
            if (!startIcon || !endIcon) return null;

            const lineVertices = vertices[index] || [];
            const points = [
              [
                startIcon.offsetLeft + startIcon.offsetWidth / 2,
                startIcon.offsetTop + startIcon.offsetHeight / 2,
              ],
              ...lineVertices,
              [
                endIcon.offsetLeft + endIcon.offsetWidth / 2,
                endIcon.offsetTop + endIcon.offsetHeight / 2,
              ],
            ]
              .map(([x, y]) => `${x},${y}`)
              .join(' ');

            let groupFrom;
            let groupTo;
            let lineGroup;
            Object.keys(iconParameters).forEach((el) => {
              if (el === line[0]) {
                groupFrom = iconParameters[el].group;
              }
              if (el === line[1]) {
                groupTo = iconParameters[el].group;
              }
            });

            if (groupFrom && groupFrom === groupTo) {
              lineGroup = groupFrom;
            }

            return (
              <polyline
                key={index}
                points={points}
                data-group={lineGroup}
                stroke='black'
                strokeWidth='2'
                strokeLinecap='round'
                fill='none'
                style={{ cursor: 'pointer' }}
                onDoubleClick={(e) => handleDoubleClick(e, index)}
                onContextMenu={(e) => handleLineContextMenu(e, index)}
              />
            );
          })}
          {Object.entries(vertices).map(([lineIndex, lineVertices]) => {
            return lineVertices.map(([x, y], vertexIndex) => {
              return (
                <circle
                  key={`${lineIndex}-${vertexIndex}`}
                  cx={x}
                  cy={y}
                  r={4} // Adjust the vertex size (radius) as needed
                  fill='white'
                  stroke='black'
                  strokeWidth='2'
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    mouseOffsetRef.current = [e.clientX - x, e.clientY - y];
                    setDraggedVertex([parseInt(lineIndex), vertexIndex]);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleDeleteVertex(parseInt(lineIndex), vertexIndex);
                  }}
                />
              );
            });
          })}
        </svg>
        {Object.keys(iconParameters).map((iconId) => {
          const iconElement = document.getElementById(iconId);
          if (!iconElement) return null;

          const iconRect = iconElement.getBoundingClientRect();
          const x = (iconRect.left + iconRect.width) / zoomLevel;
          const y = iconRect.top / zoomLevel;

          return (
            <div
              key={`params-${iconId}`}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              {renderParameters(iconId)}
            </div>
          );
        })}
      </div>
      <ParametrModal
        isOpen={isModalOpen}
        onClose={(parameters: any) => onModalClose(parameters)}
        elementType={currentElementType.type}
        id={currentElementType.id}
      />
      <ScaleModal isOpen={isScaleModalOpen} onClose={handleScaleModalClose} />
    </div>
  );
};

export default App;
