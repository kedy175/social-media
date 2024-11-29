import kyInstance from "@/lib/ky";
import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useSession } from "../SessionProvider";

export default function useInitializeChatClient() {
  const { user } = useSession();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.error("User data is missing");
      return;
    }

    if (!process.env.NEXT_PUBLIC_STREAM_KEY) {
      console.error("Stream API key is missing");
      return;
    }

    const client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY);

    const fetchToken = async (): Promise<string> => {
      try {
        const { token } = await kyInstance
          .get("/api/get-token", { searchParams: { id: user.id } })
          .json<{ token: string }>();
        console.log("Token fetched successfully:", token); // Debugging
        return token;
      } catch (error) {
        console.error("Error fetching token:", error);
        throw new Error("Failed to fetch token");
      }
    };

    const connectUser = async () => {
      try {
        const token = await fetchToken();
        await client.connectUser(
          {
            id: user.id,
            username: user.username,
            name: user.displayName,
            image: user.avatarUrl,
          },
          token
        );
        setChatClient(client);
        console.log("User connected successfully:", user.id);
      } catch (error) {
        console.error("Error connecting user to StreamChat:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
        });
      }
    };

    connectUser();

    return () => {
      console.log("Cleaning up StreamChat client...");
      setChatClient(null);
      client
        .disconnectUser()
        .then(() => console.log("StreamChat user disconnected"))
        .catch((error) => console.error("Failed to disconnect user:", error));
    };
  }, [user?.id, user?.username, user?.displayName, user?.avatarUrl]);

  return chatClient;
}
