import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  width?: 'sm' | 'md' | 'lg';
  position?: 'left' | 'right';
  className?: string;
  footer?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({
  sections,
  width = 'md',
  position = 'left',
  className = '',
  footer
}) => {
  // Width configurations
  const widthClasses = {
    sm: 'w-48',
    md: 'w-56',
    lg: 'w-64'
  };

  // Position classes
  const positionClasses = {
    left: 'border-r',
    right: 'border-l'
  };

  return (
    <div className={`
      ${widthClasses[width]} 
      ${positionClasses[position]} 
      bg-white border-gray-200 flex flex-col overflow-hidden 
      ${className}
    `}>
      {/* Navigation sections */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section title */}
            {section.title && (
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
            )}
            
            {/* Section items */}
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`
                    flex items-center justify-between p-3 rounded-md w-full transition-all duration-200 group
                    ${item.isActive 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : item.disabled
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <div className={`
                      ${item.isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-700'}
                      ${item.disabled ? 'text-gray-300' : ''}
                      mr-3 flex-shrink-0
                    `}>
                      {item.icon}
                    </div>
                    <span className="font-medium truncate">
                      {item.label}
                    </span>
                  </div>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className={`
                      inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full
                      ${item.isActive 
                        ? 'bg-primary-400 text-white' 
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Sidebar; 