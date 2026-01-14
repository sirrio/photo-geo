<?php

namespace App;

class PhotoMetadataExtractor
{
    /**
     * @return array{latitude: ?float, longitude: ?float, captured_at: ?string, camera_make: ?string, camera_model: ?string}
     */
    public function extract(string $path): array
    {
        if (! function_exists('exif_read_data')) {
            return $this->emptyData();
        }

        $exif = @exif_read_data($path, 'IFD0,EXIF,GPS', true);

        if (! is_array($exif)) {
            return $this->emptyData();
        }

        return [
            'latitude' => $this->gpsCoordinateToDecimal(
                $exif['GPS']['GPSLatitude'] ?? null,
                $exif['GPS']['GPSLatitudeRef'] ?? null
            ),
            'longitude' => $this->gpsCoordinateToDecimal(
                $exif['GPS']['GPSLongitude'] ?? null,
                $exif['GPS']['GPSLongitudeRef'] ?? null
            ),
            'captured_at' => $exif['EXIF']['DateTimeOriginal'] ?? null,
            'camera_make' => $exif['IFD0']['Make'] ?? null,
            'camera_model' => $exif['IFD0']['Model'] ?? null,
        ];
    }

    /**
     * @param  array<int, mixed>|null  $coordinate
     */
    private function gpsCoordinateToDecimal(?array $coordinate, ?string $hemisphere): ?float
    {
        if ($coordinate === null || $hemisphere === null || count($coordinate) < 3) {
            return null;
        }

        $degrees = $this->fractionToFloat($coordinate[0]);
        $minutes = $this->fractionToFloat($coordinate[1]);
        $seconds = $this->fractionToFloat($coordinate[2]);

        if ($degrees === null || $minutes === null || $seconds === null) {
            return null;
        }

        $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

        if (in_array($hemisphere, ['S', 'W'], true)) {
            return $decimal * -1;
        }

        return $decimal;
    }

    private function fractionToFloat(int|string $value): ?float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (! str_contains($value, '/')) {
            return null;
        }

        [$numerator, $denominator] = array_pad(explode('/', $value, 2), 2, null);

        if ($numerator === null || $denominator === null || (float) $denominator === 0.0) {
            return null;
        }

        return (float) $numerator / (float) $denominator;
    }

    /**
     * @return array{latitude: ?float, longitude: ?float, captured_at: ?string, camera_make: ?string, camera_model: ?string}
     */
    private function emptyData(): array
    {
        return [
            'latitude' => null,
            'longitude' => null,
            'captured_at' => null,
            'camera_make' => null,
            'camera_model' => null,
        ];
    }
}
