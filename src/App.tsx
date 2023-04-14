import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import * as htmlToImage from 'html-to-image';
import 'svg2pdf.js';
import './App.css';
import { BulbIcon } from './Icons/BulbIcon';
import { SensorIcon } from './Icons/SensorIcon';
import { SwitchIcon } from './Icons/SwitchIcon';
import { MainPanelIcon } from './Icons/MainPanel';
import ParametrModal from './ParametrModal/ParametrModal';
import ScaleModal from './ScaleModal/ScaleModal';
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

interface SvgIconProps {
  iconType: 'bulb' | 'sensor' | 'switch' | 'mainPanel';
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const SvgIcon: React.FC<SvgIconProps & { elementType: string; id: string }> = ({
  onDragStart,
  elementType,
  id,
}) => {
  return (
    <div
      className='icon'
      draggable='true'
      onDragStart={(e) => {
        e.dataTransfer.setData('elementType', elementType);
        e.dataTransfer.setData('iconId', id); // Pass iconId to onDragStart
        onDragStart(e);
      }}
    >
      {elementType === 'bulb' && <BulbIcon />}
      {elementType === 'sensor' && <SensorIcon />}
      {elementType === 'switch' && <SwitchIcon />}
      {elementType === 'mainPanel' && <MainPanelIcon />}
    </div>
  );
};

const App: React.FC = () => {
  const browserFrameRef = useRef<HTMLDivElement>(null);
  const draggedIconRef = useRef<HTMLDivElement | null>(null);
  const mouseOffsetRef = useRef<[number, number] | null>(null);
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vertices, setVertices] = useState<{
    [key: string]: [number, number][];
  }>({});
  const [lines, setLines] = useState<[string, string][]>([]);
  const [iconParameters, setIconParameters] = useState<{ [key: string]: any }>(
    {}
  );
  const [draggedVertex, setDraggedVertex] = useState<number[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', e.currentTarget.outerHTML);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleIconClick = useCallback(
    (iconId: string, elementType?: string) => {
      const iconElement = document.getElementById(iconId);
      if (!iconElement) return;

      setSelectedIcons((prevSelected) => {
        const newSelected = [...prevSelected, iconId];

        if (newSelected.length === 2) {
          setLines((prevLines) => [
            ...prevLines,
            [newSelected[0], newSelected[1]],
          ]);
          return [];
        }

        return newSelected;
      });
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

    // Remove the icon from the selected icons state
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

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const iconHTML = e.dataTransfer.getData('text/plain');
      const elementType = e.dataTransfer.getData('elementType');
      const wrapper = document.createElement('div');
      wrapper.classList.add('icon-wrapper');
      wrapper.innerHTML = iconHTML;

      // Generate a unique ID for the wrapper
      const iconId = `${elementType}-${Date.now()}`;
      wrapper.id = iconId;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${e.clientX - rect.left}px`;
      wrapper.style.top = `${e.clientY - rect.top}px`;

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
      });

      wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleDeleteIcon(iconId);
      });

      if (browserFrameRef.current) {
        browserFrameRef.current.addEventListener('mousemove', (e) => {
          if (!isDragging) return;

          e.stopPropagation();

          const diffX = e.clientX - startX;
          const diffY = e.clientY - startY;

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
        });
      }

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        handleIconClick(iconId);
      });

      e.currentTarget.appendChild(wrapper);
      setCurrentElementType({ type: elementType, id: iconId });
      setCurrentIconId(iconId);
      setIsModalOpen(true);
    },
    [handleIconClick, handleDeleteIcon]
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
      } else if (draggedIconRef.current) {
        draggedIconRef.current.style.left = `${x}px`;
        draggedIconRef.current.style.top = `${y}px`;
      }
    };

    const handleMouseUp = () => {
      draggedIconRef.current = null;
      mouseOffsetRef.current = null;
      setDraggedVertex(null);
    };

    if (browserFrameRef.current) {
      browserFrameRef.current.addEventListener('mousemove', handleMouseMove);
      browserFrameRef.current.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (browserFrameRef.current) {
        browserFrameRef.current.removeEventListener(
          'mousemove',
          handleMouseMove
        );
        browserFrameRef.current.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [draggedVertex]);

  const onModalClose = (parameters: any) => {
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
    const viewport = page.getViewport({ scale: 1 });

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
    const lines = document.querySelectorAll('.lines-container g.line polyline');
    let totalLength = 0;
    const groupLengths: { [key: string]: number } = {};

    lines.forEach((line) => {
      const group = line.getAttribute('data-group');
      const points = line.getAttribute('points');
      if (points && group) {
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
            totalLength += length;

            if (!groupLengths[group]) {
              groupLengths[group] = 0;
            }
            groupLengths[group] += length;
          }
        }
      }
    });
    const totalLengthInCm = scaleLine.scale
      ? totalLength / scaleLine.scale
      : totalLength;

    let alertString = '';

    Object.entries(groupLengths).map(([key, value]) => {
      alertString =
        alertString +
        `Group ${key}: ${
          scaleLine.scale
            ? `${(value / scaleLine.scale).toFixed(2)} m \n`
            : `${value.toFixed(2)} px \n`
        }`;
    });

    alert(alertString);

    // alert(
    //   `Total length of all lines: ${totalLengthInCm.toFixed(2)}${
    //     scaleLine.scale ? ' m' : ' px'
    //   }`
    // );
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
  };

  const handleScaleLineClick = (e: React.MouseEvent<SVGElement>) => {
    e.stopPropagation();
    const svgRect = (
      browserFrameRef.current as HTMLDivElement
    ).getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    if (scaleLine.points.length === 0) {
      setScaleLine({ ...scaleLine, points: [[x, y]] });
    } else if (scaleLine.points.length === 1) {
      setScaleLinePoints([]);
    } else {
      setScaleLine({ ...scaleLine, points: [...scaleLine.points, [x, y]] });
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

    if (!creatingScaleLine) {
      setCreatingScaleLine(true);
      setScaleLinePoints([[x, y]]);
    } else {
      setCreatingScaleLine(false);
      setScaleLinePoints([...scaleLinePoints, [x, y]]);
      setIsScaleModalOpen(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!creatingScaleLine) return;

      const svgRect = (
        browserFrameRef.current as HTMLDivElement
      ).getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      setScaleLinePoints((prevPoints) => {
        const newPoints = [...prevPoints];
        newPoints[1] = [x, y];
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
  }, [creatingScaleLine]);

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
          {lines.map(([from, to], lineIndex) => {
            const fromElement = document.getElementById(from);
            const toElement = document.getElementById(to);

            let groupFrom;
            let groupTo;
            let lineGroup;
            Object.keys(iconParameters).forEach((el) => {
              if (el === from) {
                groupFrom = iconParameters[el].group;
              }
              if (el === to) {
                groupTo = iconParameters[el].group;
              }
            });

            if (groupFrom && groupFrom === groupTo) {
              lineGroup = groupFrom;
            }

            if (!fromElement || !toElement) return null;

            const svgRect = (
              browserFrameRef.current as HTMLDivElement
            ).getBoundingClientRect();
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            const x1 = fromRect.left + fromRect.width / 2 - svgRect.left;
            const y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
            const x2 = toRect.left + toRect.width / 2 - svgRect.left;
            const y2 = toRect.top + toRect.height / 2 - svgRect.top;

            const lineVertices = vertices[lineIndex] || [];

            return (
              <g key={`line-${lineIndex}`} className='line'>
                <polyline
                  onDoubleClick={(e) => handleDoubleClick(e, lineIndex)}
                  points={`${x1},${y1} ${lineVertices
                    .map((vertex) => vertex.join(','))
                    .join(' ')} ${x2},${y2}`}
                  fill='none'
                  stroke='black'
                  strokeWidth='2'
                  data-group={lineGroup}
                  pointerEvents='visibleStroke'
                  onContextMenu={(e) => handleLineContextMenu(e, lineIndex)}
                />
                {lineVertices.map(([x, y], vertexIndex) => (
                  <circle
                    key={`vertex-${lineIndex}-${vertexIndex}`}
                    cx={x}
                    cy={y}
                    r='4'
                    fill='red'
                    stroke='black'
                    strokeWidth='1'
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      draggedIconRef.current = null;
                      mouseOffsetRef.current = [e.clientX - x, e.clientY - y];
                      setDraggedVertex([lineIndex, vertexIndex]);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setDraggedVertex(null);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleDeleteVertex(lineIndex, vertexIndex);
                    }}
                  />
                ))}
              </g>
            );
          })}
        </svg>
        {Object.keys(iconParameters).map((iconId) => {
          const iconElement = document.getElementById(iconId);
          if (!iconElement) return null;

          const iconRect = iconElement.getBoundingClientRect();
          const x = iconRect.left + iconRect.width;
          const y = iconRect.top;

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
