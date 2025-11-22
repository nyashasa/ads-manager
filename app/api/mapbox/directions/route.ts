import { NextResponse } from 'next/server';

export async function GET(request: Request) {
      try {
            const { searchParams } = new URL(request.url);
            const waypoints = searchParams.get('waypoints');
            const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

            if (!waypoints) {
                  return NextResponse.json({ error: 'Waypoints required' }, { status: 400 });
            }

            if (!mapboxToken) {
                  return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
            }

            // Call Mapbox Directions API from server
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&access_token=${mapboxToken}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Mapbox Directions API error:', response.status, errorText);
                  return NextResponse.json(
                        { error: 'Failed to fetch directions', details: errorText },
                        { status: response.status }
                  );
            }

            const data = await response.json();
            return NextResponse.json(data);

      } catch (error) {
            console.error('Error in directions API route:', error);
            return NextResponse.json(
                  { error: 'Internal server error' },
                  { status: 500 }
            );
      }
}

