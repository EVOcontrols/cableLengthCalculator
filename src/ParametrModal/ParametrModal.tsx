import React, { useState, useEffect } from 'react';
import './ParameterModal.css';

interface ParameterModalProps {
  isOpen: boolean;
  onClose: (parameters: any) => any;
  elementType: string;
  parameters?: any;
  id?: string;
}

const ParameterModal: React.FC<ParameterModalProps> = ({
  isOpen,
  onClose,
  elementType,
  parameters = {},
  id,
}) => {
  const [formValues, setFormValues] = useState(parameters);

  useEffect(() => {
    !formValues && setFormValues(parameters);
  }, [parameters, formValues]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormValues((prevValues: any) => ({ ...prevValues, [name]: value }));
  };

  if (!isOpen) return null;

  const renderBulbParameters = () => {
    return (
      <div className='parameters-wrapper'>
        <label>
          Группа:
          <input
            type='text'
            name='group'
            value={formValues.group || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Номер:
          <input
            type='text'
            name='name'
            value={formValues.name || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Мощность, Вт:
          <input
            type='text'
            name='power'
            value={formValues.power || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Напряжение, В:
          <input
            type='text'
            name='voltage'
            value={formValues.voltage || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Интерфейс управления:
          <select
            name='interface'
            value={formValues.interface || ''}
            onChange={handleInputChange}
          >
            <option>---</option>
            <option>PWM</option>
            <option>PWM-TW</option>
            <option>PWM-RGB</option>
            <option>PWM-RGBW</option>
            <option>TRIAC</option>
            <option>DALI</option>
            <option>DMX</option>
            <option>RELAY</option>
          </select>
        </label>
        <label>
          Опусĸ ĸабеля, м:
          <input
            type='text'
            name='cable'
            value={formValues.cable || ''}
            onChange={handleInputChange}
          />
        </label>
      </div>
    );
  };

  const renderSensorParameters = () => {
    return (
      <div className='parameters-wrapper'>
        <label>
          Группа:
          <input
            type='text'
            name='group'
            value={formValues.group || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Номер:
          <input
            type='text'
            name='name'
            value={formValues.name || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Тип:
          <select
            name='type'
            value={formValues.type || ''}
            onChange={handleInputChange}
          >
            <option>---</option>
            <option>движение</option>
            <option>температура</option>
            <option>освещенность</option>
            <option>параметры воздуха</option>
            <option>магнитный ĸонтаĸт</option>
          </select>
        </label>
        <label>
          Питание:
          <input
            type='text'
            name='power'
            value={formValues.power || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Интерфейс управления:
          <select
            name='interface'
            value={formValues.interface || ''}
            onChange={handleInputChange}
          >
            <option>---</option>
            <option>DI</option>
            <option>RS485</option>
            <option>AI</option>
            <option>1-wire</option>
          </select>
        </label>
        <label>
          Опусĸ ĸабеля, м:
          <input
            type='text'
            name='cable'
            value={formValues.cable || ''}
            onChange={handleInputChange}
          />
        </label>
      </div>
    );
  };

  const renderSwitchParameters = () => {
    return (
      <div className='parameters-wrapper'>
        <label>
          Группа:
          <input
            type='text'
            name='group'
            value={formValues.group || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Номер:
          <input
            type='text'
            name='name'
            value={formValues.name || ''}
            onChange={handleInputChange}
          />
        </label>
        <label>
          Интерфейс управления:
          <select
            name='interface'
            value={formValues.interface || ''}
            onChange={handleInputChange}
          >
            <option>---</option>
            <option>DI</option>
            <option>1-wire</option>
            <option>RS485</option>
          </select>
        </label>
        <label>
          Опусĸ ĸабеля, м:
          <input
            type='text'
            name='cable'
            value={formValues.cable || ''}
            onChange={handleInputChange}
          />
        </label>
      </div>
    );
  };

  const renderMainPanelParameters = () => {
    return (
      <div className='parameters-wrapper'>
        <label>
          Опусĸ ĸабеля, м:
          <input
            type='text'
            name='cable'
            value={formValues.cable || ''}
            onChange={handleInputChange}
          />
        </label>
      </div>
    );
  };

  return (
    <div className='modal'>
      {elementType === 'bulb' && renderBulbParameters()}
      {elementType === 'sensor' && renderSensorParameters()}
      {elementType === 'switch' && renderSwitchParameters()}
      {elementType === 'mainPanel' && renderMainPanelParameters()}
      <button
        onClick={() => {
          onClose({ ...formValues, elementType });
          setFormValues({});
        }}
      >
        Сохранить
      </button>
    </div>
  );
};

export default ParameterModal;
