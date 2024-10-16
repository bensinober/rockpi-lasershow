# Laser Show Rock PI 4SE

## Install

get and burn armbian to sd card:

    wget https://github.com/armbian/community/releases/download/24.11.0-trunk.202/Armbian_community_24.11.0-trunk.202_Rock-4se_bookworm_current_6.6.53_minimal.img.xz

    xz -d Armbian_community_24.11.0-trunk.202_Rock-4se_bookworm_current_6.6.53_minimal.img.xz | sudo dd of=/dev/sda bs=4096 conv=notrunc,noerror

sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 9B98116C9AA302C7
sudo apt-get update
sudo apt-get install -y libgpiod-dev make gcc git build-essential
sudo apt-get install -y broadcom-wifibt-firmware

fix hw overlays:

    /boot/armbianEnv.txt:
```
verbosity=1
bootlogo=false
console=both
overlay_prefix=rockchip
fdtfile=rockchip/rk3399-rock-pi-4b.dtb
#fdtfile=rockchip/rk3399-rock-4se.dtb
rootdev=UUID=3e394505-187b-4813-b13f-692a4f1ab875
rootfstype=ext4
overlays=rk3399-spi-spidev
param_spidev_spi_bus=0
usbstoragequirks=0x2537:0x1066:u,0x2537:0x1068:u
```

## rules.d


sudo groupadd gpiod
sudo usermod -a -G gpiod rock

cat <<'EOF' | sudo tee /etc/udev/rules.d/50-gpiod.rules
KERNEL=="gpio*", GROUP="gpiod", MODE="0660"
EOF

cat <<'EOF' | sudo tee /etc/udev/rules.d/50-spidev.rules
KERNEL=="spidev*", GROUP="gpiod", MODE="0660"
EOF

udevadm control --reload-rules && udevadm trigger

## lasertest.c

connected on GPIO4_A3
  * gpiochip4
  * line 3 : A(0) * 8 + 3

compile:

gcc -o lasertest lasertest.c -lgpiod

## lasershow

git clone https://github.com/bensinober/