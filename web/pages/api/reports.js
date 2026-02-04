import { getAccessToken, withApiAuthRequired } from "@auth0/nextjs-auth0";

export default withApiAuthRequired(async function reports(req, res) {
  try {
    const { accessToken } = await getAccessToken(req, res, {
      scopes: ["read:reports"]
    });

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
      res.status(500).json({ error: "missing_api_base" });
      return;
    }

    const apiRes = await fetch(`${baseUrl}/reports`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "report_fetch_failed" });
  }
});
