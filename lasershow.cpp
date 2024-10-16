#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdexcept>
#include <time.h>
#include <unistd.h>
#include <iostream>
#include <string>
#include <chrono>
#include <gpiod.h>
#include "ABE_ADCDACPi.h"
#include "Points.h"
#include "IldaReader.h"

using namespace std;
using namespace ABElectronics_CPP_Libraries;

void onInterrupt(int);

const char *chip1 = "gpiochip1"; // used by SPI
const char *chip4 = "gpiochip4"; // used by Laser
unsigned int laserPin = 3;
struct gpiod_chip *laserChip;
struct gpiod_line *laserLine;

int main(int argc, char **argv) {

    // Validate arguments.
    if (argc < 3) {
		cout << "ERROR: Arguments missing." << endl;
		cout << "Required: [pointDelay] [fileName]" << endl;
	    return 1;
	}

    // Read arguments.
    int pointDelay = atoi(argv[1]);
    string fileName = argv[2];
    double frameDuration = 0.033; // ~30fps (1/30=0.033..).

    // Setup hardware GPIO for laser
    gpiod_chip *laserChip = gpiod_chip_open_by_name(chip4);
    if (!laserChip) {
        perror("gpiod_chip_open_by_name");
        return 1;
    }

    // Get line
    gpiod_line *laserLine = gpiod_chip_get_line(laserChip, laserPin);
    if (!laserLine) {
        perror("gpiod_chip_get_line");
        gpiod_chip_close(laserChip);
        return 1;
    }

    // Request line as output
    if (gpiod_line_request_output(laserLine, "lasershow", 0) < 0) {
        perror("gpiod_line_request_output");
        gpiod_chip_close(laserChip);
        return 1;
    }

    ADCDACPi adc_dac;

    // Open the DAC SPI channel.
    if (adc_dac.open_dac() != 1) {
        return(1);
    }
    // Set the DAC gain to 1 which will give a voltage range of 0 to 2.048V.
    adc_dac.set_dac_gain(1);

    // Setup ILDA reader.
    Points points;
    IldaReader ildaReader;
    if (ildaReader.readFile(fileName)) {
        printf("Provided file is a valid ILDA file.\n");
        ildaReader.getNextFrame(&points);
        printf("Points loaded in first frame: %d\n", points.size);
    } else {
        printf("Error opening ILDA file.\n");
        return(1);
    }

    // Subscribe program to exit/interrupt signal.
    signal(SIGINT, onInterrupt);

    // Start the scanner loop with the current time.
    std::chrono::time_point<std::chrono::system_clock> start = std::chrono::system_clock::now();
    while(true) {

        // Exit if no points found.
        if (points.size == 0) {
            break;
        }

        // Move galvos to x,y position. (4096 is to invert horizontally)
        adc_dac.set_dac_raw(points.store[points.index*3],1);
        adc_dac.set_dac_raw(4096-points.store[(points.index*3)+1],2);

        // Turn on/off laser diode.
        if (points.store[(points.index*3)+2] == 1) {
            if (gpiod_line_set_value(laserLine, 1) < 0) {
                perror("gpiod_line_set_value");
                gpiod_line_release(laserLine);
                gpiod_chip_close(laserChip);
                return 1;
            }
        } else {
            if (gpiod_line_set_value(laserLine, 0) < 0) {
                perror("gpiod_line_set_value");
                gpiod_line_release(laserLine);
                gpiod_chip_close(laserChip);
                return 1;
            }
        }

        // Maybe wait a while there.
        if (pointDelay > 0) {
            usleep(pointDelay);
        }

        // In case there's no more points in the current frame check if it's time to load next frame.
        if (!points.next()) {
            std::chrono::duration<double> elapsedSeconds = std::chrono::system_clock::now() - start;
            if(elapsedSeconds.count() > frameDuration) {
                start = std::chrono::system_clock::now();
                gpiod_line_set_value(laserLine, 0);
                ildaReader.getNextFrame(&points);
            }
        }
    }

    // Cleanup and exit.
    ildaReader.closeFile();
    adc_dac.close_dac();
    return (0);
}

// Function that is called when program needs to be terminated.
void onInterrupt(int) {
    printf("Turn off laser diode.\n");
    gpiod_line_set_value(laserLine, 0);
    gpiod_line_release(laserLine);
    gpiod_chip_close(laserChip);
    printf("Program was interrupted.\n");
    exit(1);
}
