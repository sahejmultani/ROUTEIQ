import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("Fetching heatmap from backend...");
    const response = await axios.get("http://127.0.0.1:8000/heatmap/", {
      timeout: 30000, // 30 second timeout for Geotab API calls
    });
    console.log("Got response:", response.data.length, "clusters");
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("error fetching heatmap from backend", error.message);
    res.status(500).json({ 
      error: error.message || "failed to fetch heatmap",
      details: error.code 
    });
  }
}
