'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';

interface RouteMapProps {
      routes: any[];
      selectedRouteIds: string[];
      onRouteToggle: (routeId: string) => void;
}

export default function RouteMap({ routes, selectedRouteIds, onRouteToggle }: RouteMapProps) {
      const mapContainer = useRef<HTMLDivElement>(null);
      const map = useRef<mapboxgl.Map | null>(null);
      const [mapLoaded, setMapLoaded] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const routesFetchedRef = useRef<string>('');
      const routeFeaturesRef = useRef<any[]>([]);
      
      // Memoize routes to prevent unnecessary re-fetches
      const routesKey = useMemo(() => {
            return routes.map(r => r.id).sort().join(',');
      }, [routes]);
      
      // Memoize selected route IDs to prevent unnecessary updates
      const selectedRouteIdsKey = useMemo(() => {
            return [...selectedRouteIds].sort().join(',');
      }, [selectedRouteIds]);

      useEffect(() => {
            if (!mapContainer.current || map.current) return;

            // Get Mapbox token from environment
            const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            
            console.log('Mapbox token check:', {
                  hasToken: !!mapboxToken,
                  tokenLength: mapboxToken?.length || 0,
                  tokenPrefix: mapboxToken?.substring(0, 10) || 'none'
            });
            
            if (!mapboxToken) {
                  setError('Mapbox token not found. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file and restart the dev server.');
                  console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set.');
                  return;
            }

            try {
                  mapboxgl.accessToken = mapboxToken;

                  map.current = new mapboxgl.Map({
                        container: mapContainer.current,
                        style: 'mapbox://styles/mapbox/light-v11',
                        center: [18.4241, -33.9249], // Cape Town center
                        zoom: 11,
                        pitch: 75, // 3D view
                        bearing: 0,
                  });

                  map.current.on('load', () => {
                        setMapLoaded(true);
                        setError(null);
                  });

                  map.current.on('error', (e) => {
                        console.error('Mapbox error:', e);
                        setError('Failed to load map. Please check your Mapbox token.');
                  });

            } catch (err) {
                  console.error('Error initializing map:', err);
                  setError('Failed to initialize map.');
            }

            return () => {
                  if (map.current) {
                        map.current.remove();
                        map.current = null;
                  }
            };
      }, []);

      useEffect(() => {
            if (!map.current || !mapLoaded) return;
            
            // Skip if we've already fetched for these routes
            if (routesFetchedRef.current === routesKey) {
                  return;
            }
            
            routesFetchedRef.current = routesKey;

            // Remove existing sources and layers
            const existingSources = ['routes', 'selected-routes', 'routes-lines', 'selected-routes-lines'];
            const existingLayers = [
                  'routes-layer', 
                  'selected-routes-layer', 
                  'routes-lines-layer',
                  'selected-routes-lines-layer',
                  'routes-labels'
            ];

            existingLayers.forEach(layer => {
                  if (map.current?.getLayer(layer)) {
                        map.current.removeLayer(layer);
                  }
            });

            existingSources.forEach(source => {
                  if (map.current?.getSource(source)) {
                        map.current.removeSource(source);
                  }
            });

            // Fetch route paths using Mapbox Directions API
            const fetchRoutePaths = async () => {
                  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
                  if (!mapboxToken) {
                        console.error('Mapbox token not available for directions');
                        return;
                  }

                  if (routes.length === 0) {
                        console.log('No routes to draw');
                        return;
                  }

                  console.log(`Fetching directions for ${routes.length} routes`);

                  const routeFeatures = await Promise.all(
                        routes.map(async (route) => {
                              let coordinates: [number, number][] = [];
                              
                              // If we have stops, use Directions API to get road-following path
                              if (route.stops && route.stops.length >= 2) {
                                    const validStops = route.stops
                                          .filter((stop: any) => stop.lat && stop.lng)
                                          .map((stop: any) => `${stop.lng},${stop.lat}`);
                                    
                                    if (validStops.length >= 2) {
                                          try {
                                                // Use our server-side API route to call Mapbox Directions API
                                                // This avoids CORS issues and keeps the token secure
                                                const waypoints = validStops.join(';');
                                                const url = `/api/mapbox/directions?waypoints=${encodeURIComponent(waypoints)}`;
                                                
                                                console.log(`Fetching directions for route ${route.name} with ${validStops.length} stops`);
                                                
                                                const response = await fetch(url);
                                                
                                                if (response.ok) {
                                                      const data = await response.json();
                                                      if (data.routes && data.routes[0]?.geometry?.coordinates) {
                                                            coordinates = data.routes[0].geometry.coordinates as [number, number][];
                                                            console.log(`Got ${coordinates.length} coordinates for route ${route.name}`);
                                                      } else {
                                                            console.warn(`No route geometry in response for ${route.name}`, data);
                                                      }
                                                } else {
                                                      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                                      console.warn(`Directions API error for ${route.name}:`, response.status, errorData);
                                                }
                                          } catch (err) {
                                                console.warn(`Failed to fetch directions for route ${route.id}:`, err);
                                          }
                                    } else {
                                          console.log(`Route ${route.name} has ${route.stops?.length || 0} stops, but only ${validStops.length} are valid`);
                                    }
                              } else {
                                    console.log(`Route ${route.name} has no stops or less than 2 stops`);
                              }
                              
                              // If no directions available, try to use corridor polygon_geojson
                              if (coordinates.length === 0 && route.corridors?.polygon_geojson) {
                                    const geoJson = route.corridors.polygon_geojson;
                                    if (geoJson.type === 'Polygon' && geoJson.coordinates) {
                                          coordinates = geoJson.coordinates[0].map((coord: number[]) => 
                                                [coord[0], coord[1]] as [number, number]
                                          );
                                          console.log(`Using polygon geometry for route ${route.name}`);
                                    } else if (geoJson.type === 'LineString' && geoJson.coordinates) {
                                          coordinates = geoJson.coordinates.map((coord: number[]) => 
                                                [coord[0], coord[1]] as [number, number]
                                          );
                                          console.log(`Using LineString geometry for route ${route.name}`);
                                    }
                              }
                              
                              // Fallback: Create a simple route path based on route name/pattern
                              // This is a temporary solution until we have proper route geometry
                              if (coordinates.length === 0) {
                                    // Try to create a route based on common Cape Town locations
                                    // This is a placeholder - in production you'd have proper route geometry
                                    const routeName = route.name.toLowerCase();
                                    let startPoint: [number, number] = [18.4241, -33.9249]; // Cape Town center
                                    let endPoint: [number, number] = [18.4241, -33.9249];
                                    
                                    // Simple location mapping based on route names
                                    if (routeName.includes('bellville') || routeName.includes('bell')) {
                                          endPoint = [18.6731, -33.9036]; // Bellville area
                                    } else if (routeName.includes('khayelitsha') || routeName.includes('khay')) {
                                          endPoint = [18.6806, -34.0481]; // Khayelitsha area
                                    } else if (routeName.includes('milnerton')) {
                                          endPoint = [18.5000, -33.8667]; // Milnerton area
                                    } else if (routeName.includes('hout bay')) {
                                          endPoint = [18.3667, -34.0500]; // Hout Bay area
                                    } else {
                                          // Default: create a route with slight variation based on route ID
                                          const hash = route.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                          endPoint = [
                                                18.4241 + (hash % 20 - 10) * 0.01,
                                                -33.9249 + (hash % 15 - 7) * 0.01
                                          ];
                                    }
                                    
                                    // Use Directions API to get a proper road-following path between start and end
                                    try {
                                          const waypoints = `${startPoint[0]},${startPoint[1]};${endPoint[0]},${endPoint[1]}`;
                                          const url = `/api/mapbox/directions?waypoints=${encodeURIComponent(waypoints)}`;
                                          const response = await fetch(url);
                                          
                                          if (response.ok) {
                                                const data = await response.json();
                                                if (data.routes && data.routes[0]?.geometry?.coordinates) {
                                                      coordinates = data.routes[0].geometry.coordinates as [number, number][];
                                                      console.log(`Got fallback directions for ${route.name}`);
                                                }
                                          }
                                    } catch (err) {
                                          console.warn(`Fallback directions failed for ${route.name}:`, err);
                                    }
                                    
                                    // If Directions API failed, create a simple straight line
                                    if (coordinates.length === 0) {
                                          coordinates = [startPoint, endPoint];
                                          console.log(`Created simple fallback route path for ${route.name}`);
                                    }
                              }

                              return {
                                    type: 'Feature' as const,
                                    properties: {
                                          id: route.id,
                                          name: route.name,
                                          code: route.gabs_route_code,
                                    },
                                    geometry: {
                                          type: 'LineString' as const,
                                          coordinates: coordinates,
                                    },
                              };
                        })
                  );

                  // Filter out null routes (those without valid geometry)
                  const validRouteFeatures = routeFeatures.filter(f => f !== null) as any[];
                  
                  console.log(`Total routes: ${routes.length}, Valid features: ${validRouteFeatures.length}`);

                  if (validRouteFeatures.length === 0) {
                        console.warn('No valid route features to display');
                        return null;
                  }

                  const selectedFeatures = validRouteFeatures.filter(f => 
                        selectedRouteIds.includes(f.properties.id)
                  );

                  const unselectedFeatures = validRouteFeatures.filter(f => 
                        !selectedRouteIds.includes(f.properties.id)
                  );
                  
                  console.log(`Selected: ${selectedFeatures.length}, Unselected: ${unselectedFeatures.length}`);

                  // Add unselected routes as lines
                  if (unselectedFeatures.length > 0 && map.current) {
                        console.log(`Adding ${unselectedFeatures.length} unselected routes to map`);
                        try {
                              map.current.addSource('routes-lines', {
                                    type: 'geojson',
                                    data: {
                                          type: 'FeatureCollection',
                                          features: unselectedFeatures,
                                    },
                              });

                              map.current.addLayer({
                                    id: 'routes-lines-layer',
                                    type: 'line',
                                    source: 'routes-lines',
                                    paint: {
                                          'line-color': '#3b82f6',
                                          'line-width': 2,
                                          'line-opacity': 0.8,
                                    },
                              });
                              console.log('Unselected routes layer added successfully');
                        } catch (err) {
                              console.error('Error adding unselected routes layer:', err);
                        }

                        // Add click handler for unselected routes
                        const currentMap = map.current;
                        if (currentMap) {
                              currentMap.on('click', 'routes-lines-layer', (e) => {
                                    const feature = e.features?.[0];
                                    if (feature && feature.properties) {
                                          const routeId = feature.properties.id;
                                          onRouteToggle(routeId);
                                    }
                              });

                              // Change cursor on hover
                              currentMap.on('mouseenter', 'routes-lines-layer', () => {
                                    if (currentMap) {
                                          currentMap.getCanvas().style.cursor = 'pointer';
                                    }
                              });

                              currentMap.on('mouseleave', 'routes-lines-layer', () => {
                                    if (currentMap) {
                                          currentMap.getCanvas().style.cursor = '';
                                    }
                              });
                        }
                  }

                  // Add selected routes as lines
                  if (selectedFeatures.length > 0 && map.current) {
                        console.log(`Adding ${selectedFeatures.length} selected routes to map`);
                        try {
                              map.current.addSource('selected-routes-lines', {
                                    type: 'geojson',
                                    data: {
                                          type: 'FeatureCollection',
                                          features: selectedFeatures,
                                    },
                              });

                              map.current.addLayer({
                                    id: 'selected-routes-lines-layer',
                                    type: 'line',
                                    source: 'selected-routes-lines',
                                    paint: {
                                          'line-color': '#10b981',
                                          'line-width': 3,
                                          'line-opacity': 1,
                                    },
                              });
                              console.log('Selected routes layer added successfully');
                        } catch (err) {
                              console.error('Error adding selected routes layer:', err);
                        }

                        // Add click handler for selected routes
                        const currentMapSelected = map.current;
                        if (currentMapSelected) {
                              currentMapSelected.on('click', 'selected-routes-lines-layer', (e) => {
                                    const feature = e.features?.[0];
                                    if (feature && feature.properties) {
                                          const routeId = feature.properties.id;
                                          onRouteToggle(routeId);
                                    }
                              });

                              // Change cursor on hover
                              currentMapSelected.on('mouseenter', 'selected-routes-lines-layer', () => {
                                    if (currentMapSelected) {
                                          currentMapSelected.getCanvas().style.cursor = 'pointer';
                                    }
                              });

                              currentMapSelected.on('mouseleave', 'selected-routes-lines-layer', () => {
                                    if (currentMapSelected) {
                                          currentMapSelected.getCanvas().style.cursor = '';
                                    }
                              });
                        }
                  }

                  // Fit bounds to show all routes
                  if (validRouteFeatures.length > 0 && map.current) {
                        const allCoordinates: [number, number][] = [];
                        
                        validRouteFeatures.forEach(feature => {
                              if (feature.geometry.type === 'LineString') {
                                    const coords = feature.geometry.coordinates as [number, number][];
                                    allCoordinates.push(...coords);
                              }
                        });

                        if (allCoordinates.length > 0) {
                              const bounds = allCoordinates.reduce((bounds, coord) => {
                                    return bounds.extend(coord);
                              }, new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0]));

                              map.current.fitBounds(bounds, {
                                    padding: 50,
                                    maxZoom: 13,
                              });
                        }
                  }
            };

            (async () => {
                  const features = await fetchRoutePaths();
                  if (features) {
                        routeFeaturesRef.current = features;
                        // Update layers with current selection
                        updateRouteLayers(features);
                  }
            })();
      }, [routesKey, mapLoaded]);
      
      // Separate effect to update layers when selection changes (without re-fetching)
      useEffect(() => {
            if (!map.current || !mapLoaded || routeFeaturesRef.current.length === 0) return;
            
            updateRouteLayers(routeFeaturesRef.current);
      }, [selectedRouteIdsKey, mapLoaded]);
      
      // Helper function to update route layers
      const updateRouteLayers = (validRouteFeatures: any[]) => {
            if (!map.current) return;
            
            // Remove existing layers
            const existingLayers = [
                  'routes-lines-layer',
                  'selected-routes-lines-layer',
            ];
            const existingSources = ['routes-lines', 'selected-routes-lines'];
            
            existingLayers.forEach(layer => {
                  if (map.current?.getLayer(layer)) {
                        map.current.removeLayer(layer);
                  }
            });
            existingSources.forEach(source => {
                  if (map.current?.getSource(source)) {
                        map.current.removeSource(source);
                  }
            });
            
            const selectedFeatures = validRouteFeatures.filter(f => 
                  selectedRouteIds.includes(f.properties.id)
            );
            const unselectedFeatures = validRouteFeatures.filter(f => 
                  !selectedRouteIds.includes(f.properties.id)
            );
            
            // Add unselected routes
            if (unselectedFeatures.length > 0) {
                  try {
                        map.current.addSource('routes-lines', {
                              type: 'geojson',
                              data: {
                                    type: 'FeatureCollection',
                                    features: unselectedFeatures,
                              },
                        });
                        map.current.addLayer({
                              id: 'routes-lines-layer',
                              type: 'line',
                              source: 'routes-lines',
                              paint: {
                                    'line-color': '#3b82f6',
                                    'line-width': 2,
                                    'line-opacity': 0.8,
                              },
                        });
                        // Re-add click handlers
                        const currentMap = map.current;
                        if (currentMap) {
                              currentMap.on('click', 'routes-lines-layer', (e) => {
                                    const feature = e.features?.[0];
                                    if (feature && feature.properties) {
                                          onRouteToggle(feature.properties.id);
                                    }
                              });
                              currentMap.on('mouseenter', 'routes-lines-layer', () => {
                                    currentMap.getCanvas().style.cursor = 'pointer';
                              });
                              currentMap.on('mouseleave', 'routes-lines-layer', () => {
                                    currentMap.getCanvas().style.cursor = '';
                              });
                        }
                  } catch (err) {
                        console.error('Error adding unselected routes layer:', err);
                  }
            }
            
            // Add selected routes
            if (selectedFeatures.length > 0) {
                  try {
                        map.current.addSource('selected-routes-lines', {
                              type: 'geojson',
                              data: {
                                    type: 'FeatureCollection',
                                    features: selectedFeatures,
                              },
                        });
                        map.current.addLayer({
                              id: 'selected-routes-lines-layer',
                              type: 'line',
                              source: 'selected-routes-lines',
                              paint: {
                                    'line-color': '#10b981',
                                    'line-width': 3,
                                    'line-opacity': 1,
                              },
                        });
                        // Re-add click handlers
                        const currentMapSelected = map.current;
                        if (currentMapSelected) {
                              currentMapSelected.on('click', 'selected-routes-lines-layer', (e) => {
                                    const feature = e.features?.[0];
                                    if (feature && feature.properties) {
                                          onRouteToggle(feature.properties.id);
                                    }
                              });
                              currentMapSelected.on('mouseenter', 'selected-routes-lines-layer', () => {
                                    currentMapSelected.getCanvas().style.cursor = 'pointer';
                              });
                              currentMapSelected.on('mouseleave', 'selected-routes-lines-layer', () => {
                                    currentMapSelected.getCanvas().style.cursor = '';
                              });
                        }
                  } catch (err) {
                        console.error('Error adding selected routes layer:', err);
                  }
            }
      };

      if (error) {
            return (
                  <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
                        <div className="text-center p-4">
                              <p className="text-sm font-medium mb-2 text-destructive">Map Error</p>
                              <p className="text-xs text-muted-foreground">{error}</p>
                        </div>
                  </div>
            );
      }

      return (
            <div 
                  ref={mapContainer} 
                  className="w-full h-full rounded-lg overflow-hidden bg-muted" 
                  style={{ minHeight: '600px', width: '100%', height: '100%' }} 
            />
      );
}


