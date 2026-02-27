import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await axios.get("http://localhost:8000/heatmap");
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("error fetching heatmap from backend", error);
    res.status(500).json({ error: "failed to fetch heatmap" });
  }
}
