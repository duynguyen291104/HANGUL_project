export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Forward request to backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user from backend');
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    return Response.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
