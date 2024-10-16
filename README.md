# LaserShow on Rock Pi 4 A/B/SE

This is a modified version of [tteskac's rpi-lasershow/](https://github.com/tteskac/rpi-lasershow.git) which is based on the Galvo laserkit.
Thanks so much for this great effort on porting to plain c++!. It is again based on the laser galvo DIY project from
https://www.instructables.com/id/Arduino-Laser-Show-With-Real-Galvos/ . It is modified for use on a Rock Pi 4SE, should work on any of these.
It also uses gpiod for laser instead of the deprecated WiringPi.

![Front Fazer](https://raw.githubusercontent.com/bensinober/rockpi-lasershow/master/docs/fazer_front.jpg)

![Projected Fazer](https://raw.githubusercontent.com/bensinober/rockpi-lasershow/master/docs/fazer_logo_project.jpg)

## Software
- Written in C++ for Raspberry Pi / Rock Pi (all versions should work).
- uses gpiod for laser control
- uses [ABE_ADCDACPi](https://github.com/abelectronicsuk/ABElectronics_CPP_Libraries/tree/master/ADCDACPi) c++ library from ABElectronics for controlling digital to analog converter from Rpi.
- NB: for now, only LPID version 1 format is supported. (2D with indexed colour)

## Hardware

- Rock Pi 4Se
- MCP4822 DAC. I created my own board for that but you can use e.g. [ADC-DAC Pi Zero](https://pinout.xyz/pinout/adc_dac_pi_zero) as well.
  Be careful when operating with higher currents (op-amp), as the MPC cannot tolerate high spikes
- galvo kit (2 galvos + controller board)
- optional make circuit for amplifying / distributing dac signal for better galvo handling
- laser diode

## Rock Pi specifics

See RockPI.md for further installation instructions on Rock PI. I had much trouble getting spidev to work, so using a prepared armbian with correct overlay is safest.
(rk3399-spi-spidev) in my case. I also chose spidev2.0 since SPI1 has conflicting onboard flash.

[Rock Pi 4 pinout](https://wiki.radxa.com/Rock4/hardware/gpio)

## Installation
1) Clone this project
2) Run ```make``` to build executable
3) Start with ```./lasershow 0 ilda-files/test.ild``` (0 means delay after every point in microseconds)
4) Have fun!

Btw#2, this project currently supports only ILDA type 1, so make sure you export correct version.


## Wiring
The code is using SPI for communication with DAC and one GPIO for laser diode:
```
/-----------------------------------------\
| MCP4822       | Rock PI 4               |
|-----------------------------------------|
| PIN 1 (Vdd)   | +5V pin, e.g. 2         |
| PIN 2 (CS)    | PIN 33 (CE2)  GPIO2_B4  |
| PIN 3 (SCK)   | PIN 7 (CLK)   GPIO2_B3  |
| PIN 4 (SDI)   | PIN 29 (TRX)  GPIO2_B0  |
| PIN 5 (LDAC)  | GND pin, e.g. 20        |
| PIN 7 (Vss)   | GND pin, e.g. 6         |
|-----------------------------------------|
| PIN 8 (VoutA) | To galvo X              |
| PIN 6 (VoutB) | To galvo Y              |
| LASER ON      | PIN 12 (gpiod GPIO4_A3) |
\-----------------------------------------/
```

![DAC](https://raw.githubusercontent.com/bensinober/rock-lasershow/master/mcp48x2.png)

![Fazer top view](https://raw.githubusercontent.com/bensinober/rockpi-lasershow/master/docs/fazer_top.jpg)

![Fazer DAC](https://raw.githubusercontent.com/bensinober/rockpi-lasershow/master/docs/fazer_dac.jpg)

## Op-amp

Uses two dual-channel op-amps in a simple circuit to amplify 0-4V to the 12v +/- (or more) for wider angle. Also uses 4x 10ohm pots
to adjust gain and offset for both axis. Op-amp used is JT082

## Tools

- Added svg2ild.py from the brilliant [openlase](https://github.com/marcan/openlase) framework

## TODO

- fix bug in svg2ild.py script (missing final path) or rewrite to go
- add simple web ui for drawing on canvas and export to ilda / play on laser directly
