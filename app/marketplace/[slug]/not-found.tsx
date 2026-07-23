import Link from "next/link";
import { AlertTriangle, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketplaceIntegrationNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#0a0d14]">
      <div className="flex max-w-md flex-col items-center text-center px-4">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Integration Not Found</h1>
        <p className="mt-2 text-gray-400">
          The integration you are looking for does not exist or may have been removed from the marketplace.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link href="/marketplace">
            <Button variant="default" className="bg-indigo-600 hover:bg-indigo-500">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Marketplace
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
              <Search className="mr-1.5 h-4 w-4" />
              Search Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}