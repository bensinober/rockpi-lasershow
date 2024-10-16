#include <gpiod.h>
#include <stdio.h>
#include <unistd.h>

int main() {
    const char *chipname = "gpiochip4";
    // gpiod: GPIO4_A3 (8 * 0(A) + 3) => chip4, line 3
    // sysfs: GPIO4_A3 (32 * 4) + (8  * 0(A) + 3) => 131
    unsigned int line_num = 3;
    int val;

    // Open GPIO chip
    struct gpiod_chip *chip = gpiod_chip_open_by_name(chipname);
    if (!chip) {
        perror("gpiod_chip_open_by_name");
        return 1;
    }

    // Get line
    struct gpiod_line *line = gpiod_chip_get_line(chip, line_num);
    if (!line) {
        perror("gpiod_chip_get_line");
        gpiod_chip_close(chip);
        return 1;
    }

    // Request line as output
    if (gpiod_line_request_output(line, "lasertest", 0) < 0) {
        perror("gpiod_line_request_output");
        gpiod_chip_close(chip);
        return 1;
    }

    // Toggle the GPIO line
    for (int i = 0; i < 9; ++i) {
        val = i % 2;
        if (gpiod_line_set_value(line, val) < 0) {
            perror("gpiod_line_set_value");
            gpiod_line_release(line);
            gpiod_chip_close(chip);
            return 1;
        }
        printf("Set line %u to %d\n", line_num, val);
        sleep(1);
    }

    // Release line and close chip
    gpiod_line_release(line);
    gpiod_chip_close(chip);

    return 0;
}
