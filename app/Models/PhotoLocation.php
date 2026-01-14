<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhotoLocation extends Model
{
    /** @use HasFactory<\Database\Factories\PhotoLocationFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'original_name',
        'mime_type',
        'size',
        'url',
        'captured_at',
        'camera_make',
        'camera_model',
        'latitude',
        'longitude',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toGeoJsonFeature(): array
    {
        return [
            'type' => 'Feature',
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [$this->longitude, $this->latitude],
            ],
            'properties' => [
                'name' => $this->original_name,
                'description' => $this->descriptionHtml(),
                'photo_url' => $this->url,
                'captured_at' => $this->captured_at,
                'camera_make' => $this->camera_make,
                'camera_model' => $this->camera_model,
            ],
        ];
    }

    private function descriptionHtml(): string
    {
        $parts = [
            sprintf('<img src="%s" alt="Photo" />', $this->url),
        ];

        if ($this->captured_at) {
            $parts[] = sprintf('<strong>Captured:</strong> %s', $this->captured_at);
        }

        $camera = trim(sprintf('%s %s', $this->camera_make ?? '', $this->camera_model ?? ''));
        if ($camera !== '') {
            $parts[] = sprintf('<strong>Camera:</strong> %s', $camera);
        }

        return implode('<br />', $parts);
    }
}
