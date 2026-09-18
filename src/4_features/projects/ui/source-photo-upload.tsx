"use client";

import { useState } from "react";

type UploadedAsset = {
  id: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
};

export function SourcePhotoUpload({
  projectId,
  initialAssets,
}: {
  projectId: string;
  initialAssets: UploadedAsset[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setError(null);
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        setError(
          "Не удалось загрузить фото. Поддерживается JPEG, PNG или WebP до 15 МБ.",
        );
        return;
      }
      const result = (await response.json()) as { asset: UploadedAsset };
      setAssets((current) => [result.asset, ...current]);
    } catch {
      setError(
        "Не удалось загрузить фото. Проверьте соединение и повторите попытку.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium">Фотографии комнаты</h2>
          <p className="mt-1 text-sm text-slate-500">
            JPEG, PNG или WebP до 15 МБ
          </p>
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
            {isUploading ? "Загружаем..." : "Добавить фото"}
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {assets.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {assets.map((asset) => (
            <figure
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              key={asset.id}
            >
              <div className="relative aspect-square">
                {/* Signed private URLs are runtime values and cannot be configured as static image domains. */}
                {/* biome-ignore lint/performance/noImgElement: private S3 URLs must be rendered directly. */}
                <img
                  className="h-full w-full object-cover"
                  src={asset.url}
                  alt="Загруженная фотография комнаты"
                />
              </div>
              <figcaption className="px-3 py-2 text-xs text-slate-500">
                {asset.width} × {asset.height} px
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Пока нет фотографий
        </div>
      )}
    </div>
  );
}
