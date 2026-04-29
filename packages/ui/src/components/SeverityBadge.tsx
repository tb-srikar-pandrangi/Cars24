type Props = {
  label: 'Excellent' | 'On Target' | 'Needs Review' | 'Critical';
};

const STYLES = {
  'Excellent': {
    bgColor: '#e8f8ee',
    textColor: '#2dc653',
    borderColor: '#2dc653',
  },
  'On Target': {
    bgColor: '#f5f5f5',
    textColor: '#666666',
    borderColor: '#cccccc',
  },
  'Needs Review': {
    bgColor: '#fff4e6',
    textColor: '#ff9f1c',
    borderColor: '#ff9f1c',
  },
  'Critical': {
    bgColor: '#fde8ea',
    textColor: '#e63946',
    borderColor: '#e63946',
  },
};

export function SeverityBadge({ label }: Props) {
  const style = STYLES[label];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        backgroundColor: style.bgColor,
        color: style.textColor,
        border: `1px solid ${style.borderColor}`,
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
