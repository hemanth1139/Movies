import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import type { Movie, MediaType } from '../types/movie';
import { searchTMDB, getReleaseYear } from '../lib/tmdb';
import { getMovieByTmdbId, bulkCreateMovies } from '../lib/database';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface CSVRow {
  serialNumber: string;
  title: string;
  type: string;
  genre: string;
}

interface ImportItem {
  row: CSVRow;
  movie?: Omit<Movie, 'id' | 'created_at' | 'updated_at'>;
  status: 'pending' | 'matched' | 'unmatched' | 'duplicate' | 'error';
  tmdbResult?: any;
}

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importStats, setImportStats] = useState({ total: 0, imported: 0, skipped: 0, failed: 0 });

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsParsing(false);
    setImportItems([]);
    setCurrentStep('upload');
    setImportStats({ total: 0, imported: 0, skipped: 0, failed: 0 });
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      if (row.title) {
        rows.push({
          serialNumber: row['serial number'] || row.serialnumber || '',
          title: row.title,
          type: row.type,
          genre: row.genre,
        });
      }
    }

    return rows;
  };

  const handleFileSelect = async (selectedFile: File) => {
    setIsParsing(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      const items: ImportItem[] = await Promise.all(
        rows.map(async (row) => {
          const item: ImportItem = { row, status: 'pending' };

          // Normalize type
          let normalizedType: MediaType = 'Movie';
          if (row.type.toLowerCase().includes('tv') || row.type.toLowerCase().includes('series')) {
            normalizedType = 'TV Series';
          }

          // Search TMDB
          const searchType = normalizedType === 'TV Series' ? 'tv' : 'movie';
          const results = await searchTMDB(row.title, searchType);

          if (results.length > 0) {
            const bestMatch = results[0];

            // Check for duplicates
            const existing = await getMovieByTmdbId(bestMatch.id);
            if (existing) {
              item.status = 'duplicate';
            } else {
              item.status = 'matched';
              item.tmdbResult = bestMatch;

              // Parse genres (handle both single genre and multiple genres with /)
              const genreList = row.genre.split('/').map(g => g.trim()).filter(g => g);

              item.movie = {
                title: bestMatch.title || bestMatch.name || row.title,
                type: normalizedType,
                genres: genreList,
                release_year: getReleaseYear(bestMatch.release_date || bestMatch.first_air_date),
                tmdb_id: bestMatch.id,
                poster_path: bestMatch.poster_path,
              };
            }
          } else {
            item.status = 'unmatched';
            // Still create entry with placeholder
            const genreList = row.genre.split('/').map(g => g.trim()).filter(g => g);
            item.movie = {
              title: row.title,
              type: normalizedType,
              genres: genreList,
              tmdb_id: undefined,
              poster_path: undefined,
            };
          }

          return item;
        })
      );

      setImportItems(items);
      setCurrentStep('review');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    setCurrentStep('importing');

    const moviesToImport = importItems
      .filter(item => item.status === 'matched' && item.movie)
      .map(item => item.movie!);

    const created = await bulkCreateMovies(moviesToImport);
    const failed = moviesToImport.length - created.length;

    setImportStats({
      total: importItems.length,
      imported: created.length,
      skipped: importItems.filter(i => i.status === 'duplicate').length,
      failed,
    });

    setCurrentStep('complete');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-modal bg-surface rounded-wl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">Import Collection</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-wl-sm transition-colors text-secondary hover:text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-full max-w-md">
                <div
                  className="border-2 border-dashed border-background rounded-xl p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && droppedFile.type === 'text/csv') {
                      handleFileSelect(droppedFile);
                    }
                  }}
                >
                  <Upload className="w-12 h-12 text-secondary mx-auto mb-4" />
                  <p className="text-primary font-medium mb-2">Drop your CSV file here</p>
                  <p className="text-secondary text-sm mb-4">or click to browse</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        handleFileSelect(selectedFile);
                      }
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors cursor-pointer"
                  >
                    Select CSV File
                  </label>
                </div>

                <div className="mt-6 p-4 bg-background rounded-lg">
                  <p className="text-sm text-secondary mb-2">Expected CSV format:</p>
                  <code className="text-xs text-secondary/80">Serial Number, Title, Type, Genre</code>
                </div>
              </div>

              {isParsing && (
                <div className="mt-6 flex items-center gap-2 text-accent">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Parsing CSV and matching with TMDB...</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Review Import</h3>
                <p className="text-secondary text-sm">
                  Found {importItems.length} titles. Review the matches before importing.
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {importItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-background rounded-lg"
                  >
                    {item.status === 'matched' && item.tmdbResult?.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.tmdbResult.poster_path}`}
                        alt={item.row.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-primary text-sm">{item.row.title}</p>
                      <p className="text-xs text-secondary">
                        {item.row.type} • {item.row.genre}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'matched' && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                          <Check className="w-4 h-4" />
                          <span>Matched</span>
                        </div>
                      )}
                      {item.status === 'duplicate' && (
                        <div className="flex items-center gap-1 text-yellow-500 text-xs">
                          <AlertCircle className="w-4 h-4" />
                          <span>Duplicate</span>
                        </div>
                      )}
                      {item.status === 'unmatched' && (
                        <div className="flex items-center gap-1 text-red-500 text-xs">
                          <AlertCircle className="w-4 h-4" />
                          <span>Not found</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-background">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="text-secondary hover:text-primary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Import {importItems.filter(i => i.status === 'matched').length} Titles
                </button>
              </div>
            </div>
          )}

          {currentStep === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <p className="text-primary">Importing collection...</p>
              <p className="text-secondary text-sm mt-2">This may take a moment</p>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Check className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-2xl font-semibold text-primary mb-2">Import Complete</h3>
              <div className="text-center space-y-2 mb-6">
                <p className="text-secondary">
                  <span className="text-primary font-medium">{importStats.imported}</span> titles imported
                </p>
                <p className="text-secondary">
                  <span className="text-primary font-medium">{importStats.skipped}</span> duplicates skipped
                </p>
                {importStats.failed > 0 && (
                  <p className="text-red-400">
                    <span className="font-medium">{importStats.failed}</span> failed to import
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-6 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
