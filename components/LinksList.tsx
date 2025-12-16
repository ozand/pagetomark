import { ProcessedLink } from '../types';

interface LinksListProps {
  links: ProcessedLink[];
  selectedId: string | null;
  onSelectLink: (id: string) => void;
  onRemoveLink: (id: string) => void;
  onClearAll: () => void;
}

export const LinksList = ({ links, selectedId, onSelectLink, onRemoveLink, onClearAll }: LinksListProps) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.75rem',
      marginTop: '1rem' 
    }}>
      {links.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
            Обработанные ссылки ({links.length})
          </h3>
          <button
            onClick={onClearAll}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Очистить все
          </button>
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {links.map((link) => (
          <div
            key={link.id}
            onClick={() => link.status === 'completed' && onSelectLink(link.id)}
            style={{
              padding: '0.75rem',
              border: `2px solid ${selectedId === link.id ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: link.status === 'completed' ? 'pointer' : 'default',
              backgroundColor: selectedId === link.id ? '#eff6ff' : 'white',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: link.status === 'processing' ? 0.6 : 1
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '0.85rem', 
                fontWeight: '500',
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {link.result?.title || 'Обработка...'}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {link.url}
              </div>
              {link.status === 'error' && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#ef4444',
                  marginTop: '0.25rem'
                }}>
                  Ошибка: {link.error}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
              {link.status === 'processing' && (
                <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>⏳</span>
              )}
              {link.status === 'completed' && (
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓</span>
              )}
              {link.status === 'error' && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>✗</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLink(link.id);
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
