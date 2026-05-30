import React, { useRef } from 'react';
import type { SampleKey } from './reducer';

interface Props {
  sampleKey: SampleKey;
  onSample: (key: 'balloon' | 'tower') => void;
  onUpload: (file: File) => void;
}

export default function SamplePicker({ sampleKey, onSample, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === 'upload') {
      fileInputRef.current?.click();
      return;
    }
    if (value === 'balloon' || value === 'tower') {
      onSample(value);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <label className="control control-sample">
      <span className="control-label">Sample</span>
      <select value={sampleKey} onChange={handleSelect}>
        <option value="balloon">Balloon</option>
        <option value="tower">Tower</option>
        <option value="upload">Upload…</option>
      </select>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </label>
  );
}
