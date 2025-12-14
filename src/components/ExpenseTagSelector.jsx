import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import ApiService from '@/services/api';

const TAG_LABELS = ['For', 'Lifestyle Level', 'Payment From'];

export default function ExpenseTagSelector({ 
  userId, 
  values = { 'For': '', 'Lifestyle Level': '', 'Payment From': '' },
  onChange,
  onBlur
}) {
  const [tags, setTags] = useState({
    'For': [],
    'Lifestyle Level': [],
    'Payment From': []
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({
    'For': false,
    'Lifestyle Level': false,
    'Payment From': false
  });
  const [showSuggestions, setShowSuggestions] = useState({
    'For': false,
    'Lifestyle Level': false,
    'Payment From': false
  });
  const [focusedIndex, setFocusedIndex] = useState({
    'For': -1,
    'Lifestyle Level': -1,
    'Payment From': -1
  });
  const [newTagInputs, setNewTagInputs] = useState({
    'For': '',
    'Lifestyle Level': '',
    'Payment From': ''
  });
  const [creating, setCreating] = useState({
    'For': false,
    'Lifestyle Level': false,
    'Payment From': false
  });
  // Local state for input values to enable immediate typing
  const [inputValues, setInputValues] = useState({
    'For': values['For'] || '',
    'Lifestyle Level': values['Lifestyle Level'] || '',
    'Payment From': values['Payment From'] || ''
  });
  const dropdownRefs = useRef({});
  const inputRefs = useRef({});
  const blurTimeoutRef = useRef({});

  useEffect(() => {
    if (userId) {
      loadTags();
    }
  }, [userId]);

  // Sync local input values with prop values when they change externally
  useEffect(() => {
    setInputValues({
      'For': values['For'] || '',
      'Lifestyle Level': values['Lifestyle Level'] || '',
      'Payment From': values['Payment From'] || ''
    });
  }, [values['For'], values['Lifestyle Level'], values['Payment From']]);

  useEffect(() => {
    // Close dropdowns and suggestions when clicking outside
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach(label => {
        if (dropdownRefs.current[label] && !dropdownRefs.current[label].contains(event.target)) {
          setExpanded(prev => ({ ...prev, [label]: false }));
          setShowSuggestions(prev => ({ ...prev, [label]: false }));
          setFocusedIndex(prev => ({ ...prev, [label]: -1 }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clean up any pending blur timeouts
      Object.values(blurTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getExpenseTags(userId);
      const loadedTags = response.tags || {
        'For': [],
        'Lifestyle Level': [],
        'Payment From': []
      };
      console.log('Loaded tags:', loadedTags);
      setTags(loadedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (tagLabel) => {
    const tagName = newTagInputs[tagLabel]?.trim();
    if (!tagName) return;

    try {
      setCreating(prev => ({ ...prev, [tagLabel]: true }));
      await ApiService.createExpenseTag({
        tag_label: tagLabel,
        tag_name: tagName
      });
      setNewTagInputs(prev => ({ ...prev, [tagLabel]: '' }));
      await loadTags();
      // Auto-select the newly created tag
      onChange({ ...values, [tagLabel]: tagName });
    } catch (error) {
      console.error('Error creating tag:', error);
      alert(error.message || 'Failed to create tag. It may already exist.');
    } finally {
      setCreating(prev => ({ ...prev, [tagLabel]: false }));
    }
  };

  const handleSelectTag = (tagLabel, tagName) => {
    // Cancel any pending blur timeout
    if (blurTimeoutRef.current[tagLabel]) {
      clearTimeout(blurTimeoutRef.current[tagLabel]);
      delete blurTimeoutRef.current[tagLabel];
    }
    
    // Update local state immediately
    setInputValues(prev => ({ ...prev, [tagLabel]: tagName }));
    
    // Notify parent
    onChange({ ...values, [tagLabel]: tagName });
    setExpanded(prev => ({ ...prev, [tagLabel]: false }));
    setShowSuggestions(prev => ({ ...prev, [tagLabel]: false }));
    setFocusedIndex(prev => ({ ...prev, [tagLabel]: -1 }));
  };

  const handleClearTag = (tagLabel) => {
    setInputValues(prev => ({ ...prev, [tagLabel]: '' }));
    onChange({ ...values, [tagLabel]: '' });
    setShowSuggestions(prev => ({ ...prev, [tagLabel]: false }));
  };

  const toggleDropdown = (tagLabel) => {
    setExpanded(prev => ({ ...prev, [tagLabel]: !prev[tagLabel] }));
  };

  // Filter tags based on input value - prioritizes startsWith matches
  const getFilteredTags = (tagLabel, inputValue) => {
    const allTags = tags[tagLabel] || [];
    
    if (!inputValue || !inputValue.trim()) {
      return allTags;
    }
    
    const searchTerm = inputValue.toLowerCase().trim();
    
    // Separate tags that start with the search term from those that just contain it
    const startsWith = allTags.filter(tag => 
      tag.tag_name && tag.tag_name.toLowerCase().startsWith(searchTerm)
    );
    const contains = allTags.filter(tag => 
      tag.tag_name && 
      tag.tag_name.toLowerCase().includes(searchTerm) && 
      !tag.tag_name.toLowerCase().startsWith(searchTerm)
    );
    
    // Return startsWith matches first, then contains matches
    const filtered = [...startsWith, ...contains];
    return filtered;
  };

  const handleInputChange = (tagLabel, value) => {
    // Update local state immediately for responsive typing
    setInputValues(prev => ({ ...prev, [tagLabel]: value }));
    
    // Notify parent of change
    onChange({ ...values, [tagLabel]: value });
    
    // Show suggestions if there's input and matching tags
    const filtered = getFilteredTags(tagLabel, value);
    const shouldShow = value.trim().length > 0 && filtered.length > 0;
    setShowSuggestions(prev => ({ 
      ...prev, 
      [tagLabel]: shouldShow 
    }));
    setFocusedIndex(prev => ({ ...prev, [tagLabel]: -1 }));
  };

  const handleInputFocus = (tagLabel) => {
    const value = inputValues[tagLabel] || '';
    const filtered = getFilteredTags(tagLabel, value);
    if (value.trim().length > 0 && filtered.length > 0) {
      setShowSuggestions(prev => ({ ...prev, [tagLabel]: true }));
    }
  };

  const handleInputBlur = async (tagLabel, e) => {
    // Clear any existing timeout for this label
    if (blurTimeoutRef.current[tagLabel]) {
      clearTimeout(blurTimeoutRef.current[tagLabel]);
    }
    
    // Delay to allow click on suggestion to register
    blurTimeoutRef.current[tagLabel] = setTimeout(() => {
      // Check if dropdown is still open (user might have clicked an item)
      if (!showSuggestions[tagLabel] && !expanded[tagLabel]) {
        const tagName = inputValues[tagLabel]?.trim() || '';
        if (tagName && !tags[tagLabel].some(t => t.tag_name === tagName)) {
          // Create new tag if it doesn't exist
          ApiService.createExpenseTag({
            tag_label: tagLabel,
            tag_name: tagName
          }).then(() => {
            loadTags();
          }).catch(error => {
            console.error('Error creating tag on blur:', error);
          });
        }
      }
      setShowSuggestions(prev => ({ ...prev, [tagLabel]: false }));
      setFocusedIndex(prev => ({ ...prev, [tagLabel]: -1 }));
      delete blurTimeoutRef.current[tagLabel];
      
      // Call parent's onBlur callback with current tag values to trigger save
      if (onBlur) {
        onBlur({
          'For': inputValues['For'] || '',
          'Lifestyle Level': inputValues['Lifestyle Level'] || '',
          'Payment From': inputValues['Payment From'] || ''
        });
      }
    }, 200);
  };

  const handleKeyDown = (tagLabel, e) => {
    const currentValue = inputValues[tagLabel] || '';
    const filtered = getFilteredTags(tagLabel, currentValue);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(prev => ({ ...prev, [tagLabel]: true }));
      setFocusedIndex(prev => ({
        ...prev,
        [tagLabel]: Math.min(prev[tagLabel] + 1, filtered.length - 1)
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => ({
        ...prev,
        [tagLabel]: Math.max(prev[tagLabel] - 1, -1)
      }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = focusedIndex[tagLabel];
      if (currentIndex >= 0 && currentIndex < filtered.length) {
        handleSelectTag(tagLabel, filtered[currentIndex].tag_name);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(prev => ({ ...prev, [tagLabel]: false }));
      setFocusedIndex(prev => ({ ...prev, [tagLabel]: -1 }));
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-white dark:bg-gray-800">
      {TAG_LABELS.map((label) => (
        <div key={label} className="relative">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
              {label}:
            </label>
            <div className="flex-1 relative" ref={el => dropdownRefs.current[label] = el}>
              {/* Selected value display */}
              <div className="flex items-center gap-1">
                <div className="flex-1 relative">
                  {/* Input with inline autocomplete */}
                  {(() => {
                    const inputValue = inputValues[label] || '';
                    const filtered = getFilteredTags(label, inputValue);
                    // Get top suggestion that starts with the input (prioritize startsWith matches)
                    const topSuggestion = filtered.length > 0 && inputValue.trim() 
                      ? (filtered.find(tag => tag.tag_name.toLowerCase().startsWith(inputValue.toLowerCase()))?.tag_name || filtered[0].tag_name)
                      : null;
                    // Show autocomplete if there's a suggestion that starts with input and it's not already fully typed
                    const showAutocomplete = topSuggestion && 
                                           topSuggestion.toLowerCase().startsWith(inputValue.toLowerCase()) &&
                                           topSuggestion.toLowerCase() !== inputValue.toLowerCase() &&
                                           inputValue.trim().length > 0;
                    
                    return (
                      <div className="relative flex-1">
                        <div className="relative" style={{ position: 'relative' }}>
                          {/* Autocomplete suggestion overlay - positioned behind input */}
                          {showAutocomplete && (
                            <div 
                              className="absolute left-0 top-0 pointer-events-none flex items-center"
                              style={{ 
                                zIndex: 1,
                                width: '100%',
                                height: '36px',
                                paddingLeft: '12px',
                                paddingRight: '12px',
                                fontSize: '16px',
                                lineHeight: '24px',
                                border: '1px solid transparent',
                                borderRadius: '6px'
                              }}
                            >
                              <span style={{ 
                                color: '#9ca3af',
                                whiteSpace: 'nowrap'
                              }} className="dark:text-gray-400">
                                {inputValue}
                                <span style={{ color: '#6b7280' }} className="dark:text-gray-400">
                                  {topSuggestion.substring(inputValue.length)}
                                </span>
                              </span>
                            </div>
                          )}
                          <Input
                            ref={el => inputRefs.current[label] = el}
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleInputChange(label, e.target.value)}
                            onFocus={() => handleInputFocus(label)}
                            onBlur={(e) => handleInputBlur(label, e)}
                            onKeyDown={(e) => {
                              // Handle Tab or Right Arrow to accept autocomplete
                              if ((e.key === 'Tab' || e.key === 'ArrowRight') && showAutocomplete) {
                                e.preventDefault();
                                handleSelectTag(label, topSuggestion);
                                return;
                              }
                              handleKeyDown(label, e);
                            }}
                            placeholder={showAutocomplete ? '' : `Select or type ${label.toLowerCase()}`}
                            className={`flex-1 relative ${showAutocomplete ? '!bg-transparent dark:!bg-transparent' : ''}`}
                            style={{ 
                              position: 'relative',
                              zIndex: 10
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Autocomplete suggestions dropdown - positioned relative to input container */}
                  {showSuggestions[label] && (() => {
                    const currentInputValue = inputValues[label] || '';
                    const filtered = getFilteredTags(label, currentInputValue);
                    return (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto top-full left-0"
                        onMouseDown={(e) => {
                          // Prevent blur from firing when clicking on dropdown
                          e.preventDefault();
                        }}
                      >
                        {filtered.length > 0 ? (
                          filtered.map((tag, index) => (
                            <button
                              key={tag.id}
                              type="button"
                              onMouseDown={(e) => {
                                // Prevent input blur
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectTag(label, tag.tag_name);
                              }}
                              className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                focusedIndex[label] === index ? 'bg-blue-50 dark:bg-blue-900' : ''
                              } ${
                                inputValues[label] === tag.tag_name ? 'bg-blue-50 dark:bg-blue-900' : ''
                              }`}
                            >
                              {tag.tag_name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No matching tags
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {inputValues[label] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearTag(label)}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDropdown(label)}
                  className="h-9 w-9 p-0"
                >
                  {expanded[label] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Dropdown menu */}
              {expanded[label] && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {/* Existing tags */}
                  {tags[label].length > 0 && (
                    <div className="p-1">
                      {tags[label].map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleSelectTag(label, tag.tag_name)}
                          className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            inputValues[label] === tag.tag_name ? 'bg-blue-50 dark:bg-blue-900' : ''
                          }`}
                        >
                          {tag.tag_name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Create new tag */}
                  <div className="border-t p-2">
                    <div className="flex gap-1">
                      <Input
                        type="text"
                        value={newTagInputs[label] || ''}
                        onChange={(e) => setNewTagInputs(prev => ({ ...prev, [label]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateTag(label);
                          }
                        }}
                        placeholder={`New ${label.toLowerCase()}`}
                        className="flex-1 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCreateTag(label)}
                        disabled={creating[label] || !newTagInputs[label]?.trim()}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

