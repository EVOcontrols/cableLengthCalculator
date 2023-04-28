import { BulbIcon } from '../Icons/BulbIcon';
import { MainPanelIcon } from '../Icons/MainPanel';
import { SensorIcon } from '../Icons/SensorIcon';
import { SwitchIcon } from '../Icons/SwitchIcon';
import './SvgIcon.css';

interface SvgIconProps {
  iconType: 'bulb' | 'sensor' | 'switch' | 'mainPanel';
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  elementType: string;
  id: string;
  zoomLevel?: number;
}

export const SvgIcon: React.FC<SvgIconProps> = ({
  onDragStart,
  elementType,
  zoomLevel,
  id,
}) => {
  return (
    <div
      className='icon'
      draggable='true'
      onDragStart={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('elementType', elementType);
        e.dataTransfer.setData('iconId', id);
        e.dataTransfer.setData('offsetX', offsetX.toString());
        e.dataTransfer.setData('offsetY', offsetY.toString());

        onDragStart(e);
      }}
    >
      {elementType === 'bulb' && <BulbIcon zoomLevel={zoomLevel} />}
      {elementType === 'sensor' && <SensorIcon />}
      {elementType === 'switch' && <SwitchIcon />}
      {elementType === 'mainPanel' && <MainPanelIcon />}
    </div>
  );
};
