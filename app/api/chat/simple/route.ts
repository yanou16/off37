import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/chat/simple: Starting request processing');
    
    // Extraire les données de la requête
    const { messages } = await request.json();
    
    // Créer une réponse simple
    const responseMessage = "Votre message a été reçu avec succès. Ceci est une réponse de test.";
    
    // Renvoyer la réponse
    return NextResponse.json({
      message: responseMessage,
      chatState: {
        stage: 'test',
        userPreferences: [],
        selectedLocation: null,
        suggestedLocations: []
      },
      places: []
    });
    
  } catch (error) {
    console.error('Error in simple chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}