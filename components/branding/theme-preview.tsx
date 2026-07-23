"use client";

import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ThemePreviewProps {
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string | null;
}

export function ThemePreview({ brandColor, secondaryColor, accentColor, logo }: ThemePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <div className="p-4 text-white text-center text-sm font-semibold" style={{ background: `linear-gradient(135deg, ${brandColor}, ${secondaryColor})` }}>
            {logo && <img src={logo} alt="Logo" className="h-8 mx-auto mb-2" />}
            <p>Header / Navigation</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: brandColor }}>Primary Button</button>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: secondaryColor }}>Secondary</button>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: accentColor }}>Accent</button>
            </div>

            <div className="h-3 rounded-full" style={{ background: `linear-gradient(90deg, ${brandColor}, ${secondaryColor}, ${accentColor})`, width: "60%" }} />

            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 rounded-lg" style={{ backgroundColor: brandColor + "20" }} />
              <div className="h-16 rounded-lg" style={{ backgroundColor: secondaryColor + "20" }} />
              <div className="h-16 rounded-lg" style={{ backgroundColor: accentColor + "20" }} />
            </div>
          </div>

          <div className="p-3 text-white text-center text-xs" style={{ backgroundColor: secondaryColor }}>
            Footer
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
