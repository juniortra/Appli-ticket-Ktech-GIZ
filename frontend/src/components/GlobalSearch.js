import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from './ui/input';
import { Search, FileText, ClipboardList, AlertCircle, Calendar, X } from 'lucide-react';
import { getStatusBadgeColor, getPriorityBadgeColor } from '../utils/helpers';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TYPE_ICONS = {
  FRM: FileText,
  FDI: ClipboardList,
  RDD: FileText,
  RDI: AlertCircle,
  TASK: Calendar,
};

const TYPE_COLORS = {
  FRM: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  FDI: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30',
  RDD: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  RDI: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  TASK: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
};

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/search`, {
          params: { q: query },
          withCredentials: true,
        });
        setResults(response.data.results || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result) => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    navigate(result.route);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {});

  return (
    <div ref={searchRef} className="relative w-full max-w-md" data-testid="global-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Rechercher fiches, tâches... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-9 pr-9 h-9 bg-secondary/50 border-border/50 focus:bg-background"
          data-testid="global-search-input"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
            data-testid="clear-search-button"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-50"
          data-testid="search-results-dropdown"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Recherche...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Aucun résultat pour "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Essayez avec d'autres mots-clés</p>
            </div>
          ) : (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </div>
              {Object.entries(groupedResults).map(([type, items]) => {
                const Icon = TYPE_ICONS[type] || FileText;
                return (
                  <div key={type} className="mb-3 last:mb-0">
                    <div className={`text-xs font-semibold uppercase px-2 py-1 rounded ${TYPE_COLORS[type] || ''}`}>
                      {type === 'TASK' ? 'Tâches' : type} ({items.length})
                    </div>
                    <div className="space-y-1 mt-1">
                      {items.map((result) => (
                        <button
                          key={`${result.type}-${result.form_id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-secondary flex items-start gap-3 group"
                          data-testid={`search-result-${result.form_id}`}
                        >
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.priority && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityBadgeColor(result.priority)}`}>
                                  {result.priority}
                                </span>
                              )}
                              {result.status && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadgeColor(result.status)}`}>
                                  {result.status.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                            )}
                            {result.date && (
                              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{result.date}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
